# -*- coding: utf-8 -*-
import MetaTrader5 as mt5
import requests
import json
import os
import time
from datetime import datetime, timedelta
import logging
import pytz
from collections import defaultdict
import urllib3
import subprocess

# suppress insecure-cert warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# logging setup
logging.basicConfig(
    filename="C:\\tradesync\\sync_log.txt",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# load config
with open("C:\\tradesync\\user.json", encoding="utf-8-sig") as f:
    cfg = json.load(f)

TERMINAL_PATH = cfg["terminal_path"]
LOGIN         = int(cfg["login"])
PASSWORD      = cfg["password"]
SERVER        = cfg["server"]
JWT_TOKEN     = cfg["jwt_token"]
API_ENDPOINT  = cfg["api_endpoint"]

def initialize_mt5():
    """
    Initialize MetaTrader 5 via IPC. If that fails, launch terminal in portable mode,
    wait 10s for IPC socket, then re-attempt.
    """
    if mt5.initialize(path=TERMINAL_PATH, login=LOGIN, password=PASSWORD, server=SERVER):
        logging.info("MetaTrader 5 initialized & logged in.")
        return True

    logging.warning(f"MT5 init failed {mt5.last_error()}, launching terminal…")
    try:
        subprocess.Popen([TERMINAL_PATH, "/portable"], cwd=os.path.dirname(TERMINAL_PATH))
    except Exception as e:
        logging.error(f"Failed to launch MT5 terminal: {e}")
        return False

    time.sleep(10)  # give it time to open
    if mt5.initialize(path=TERMINAL_PATH, login=LOGIN, password=PASSWORD, server=SERVER):
        logging.info("MetaTrader 5 re-initialized & logged in.")
        return True

    logging.error(f"MT5 re-init failed {mt5.last_error()}")
    return False

def fetch_trades():
    """
    Fetches both open positions and closed trades from MT5 history with corrected logic.
    """
    trades = []

    # 1. Get all currently open positions. This is our source of truth for what is "open".
    open_positions = mt5.positions_get()
    open_position_tickets = {p.ticket for p in open_positions} if open_positions else set()

    if open_positions:
        logging.info(f"Found {len(open_positions)} open positions.")
        for p in open_positions:
            trades.append({
                "symbol":     p.symbol,
                "direction":  "BUY" if p.type == mt5.POSITION_TYPE_BUY else "SELL",
                "entryPrice": p.price_open,
                "exitPrice":  p.price_current,
                "entryTime":  datetime.fromtimestamp(p.time, tz=pytz.UTC).isoformat(),
                "exitTime":   None,  # Correctly null for open positions
                "quantity":   p.volume,
                "result":     p.profit,
                "ticketId":   str(p.ticket),
                "platform":   "mt5",
                "tags":       ["mt5", "open"],
                "notes":      "Auto-synced from MT5 (Open)"
            })
    else:
        logging.info("No open positions found.")

    # 2. Get all historical deals to process for CLOSED trades.
    utc_from = datetime(2020, 1, 1, tzinfo=pytz.UTC)
    utc_to   = datetime.now(pytz.UTC) + timedelta(days=1) # Use days=1 for safety
    deals = mt5.history_deals_get(utc_from, utc_to)

    if not deals:
        logging.info("No historical deals to process for closed trades.")
        return trades # Return early if only open positions existed

    logging.info(f"Found {len(deals)} historical deals to process.")
    
    # Group deals by their position ID
    grouped_deals = defaultdict(list)
    for d in deals:
        grouped_deals[d.position_id].append(d)

    # 3. Process the groups into closed trades, IGNORING deals for positions that are still open.
    closed_trade_count = 0
    for pid, grp in grouped_deals.items():
        # **FIX 1: Ignore non-trading balance operations**
        if pid == 0:
            continue

        # **FIX 2: If the position ID is in our list of open positions, skip it.**
        # It has already been processed as an open position.
        if pid in open_position_tickets:
            continue
        
        # This group is a confirmed closed trade.
        closed_trade_count += 1
        
        # Sort by millisecond timestamp for accuracy
        grp_sorted = sorted(grp, key=lambda d: d.time_msc)
        entry_deal = grp_sorted[0]
        exit_deal  = grp_sorted[-1]
        
        # Calculate profit correctly across all deals for this position (e.g., for partial closes)
        total_profit = sum(d.profit + d.commission + d.swap for d in grp)

        trades.append({
            "symbol":     entry_deal.symbol,
            "direction":  "BUY" if entry_deal.type == mt5.ORDER_TYPE_BUY else "SELL",
            "entryPrice": entry_deal.price,
            "exitPrice":  exit_deal.price,
            "entryTime":  datetime.fromtimestamp(entry_deal.time, tz=pytz.UTC).isoformat(),
            "exitTime":   datetime.fromtimestamp(exit_deal.time, tz=pytz.UTC).isoformat(), # Now correctly has an exit time
            "quantity":   entry_deal.volume,
            "result":     total_profit,
            "ticketId":   str(pid),
            "platform":   "mt5",
            "tags":       ["mt5", "closed"],
            "notes":      "Auto-synced from MT5 (Closed)"
        })

    logging.info(f"Processed {closed_trade_count} closed trades from history.")
    logging.info(f"Prepared {len(trades)} total trades to send.")
    return trades

def send_trades(trades):
    """
    Sends the list of trades to the API endpoint.
    """
    if not trades:
        logging.warning("No trades to sync.")
        return
        
    headers = {
        "Authorization": f"Bearer {JWT_TOKEN}",
        "Content-Type":  "application/json"
    }
    try:
        resp = requests.post(API_ENDPOINT, json=trades, headers=headers, verify=False)
        # Log more helpful info from the response
        if resp.status_code in [200, 201]:
             logging.info(f"API success response {resp.status_code}: {resp.text}")
        else:
             logging.error(f"API error response {resp.status_code}: {resp.text}")
    except Exception:
        logging.exception("Sync POST request failed")

def main():
    logging.info("=== MT5 sync run started ===")
    if initialize_mt5():
        all_trades = fetch_trades()
        send_trades(all_trades)
        mt5.shutdown()
        logging.info("MT5 connection shut down.")
    logging.info("=== MT5 sync run finished ===")

if __name__ == "__main__":
    main()