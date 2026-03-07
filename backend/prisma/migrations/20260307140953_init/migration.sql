-- CreateTable
CREATE TABLE `Plan` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `priceMonthly` DECIMAL(10, 2) NULL,
    `priceYearly` DECIMAL(10, 2) NULL,
    `currency` VARCHAR(191) NULL,
    `maxPlatforms` INTEGER NULL,
    `maxAccounts` INTEGER NULL,
    `features` JSON NULL,
    `aiCoach` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELED', 'EXPIRED', 'PAST_DUE') NOT NULL,
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `pendingPlanCode` VARCHAR(191) NULL,
    `pendingPlanInterval` VARCHAR(191) NULL,
    `pendingChangeAt` DATETIME(3) NULL,
    `stripeScheduleId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_stripeSubscriptionId_key`(`stripeSubscriptionId`),
    UNIQUE INDEX `Subscription_stripeScheduleId_key`(`stripeScheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `gateway` ENUM('STRIPE') NOT NULL,
    `gatewayPaymentId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'FINISHED', 'FAILED') NOT NULL,
    `rawPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_gatewayPaymentId_key`(`gatewayPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platform` ENUM('CTRADER', 'MT4', 'MT5') NOT NULL DEFAULT 'CTRADER',
    `label` VARCHAR(191) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `spotwareUserId` VARCHAR(191) NULL,
    `spotwareUsername` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformConnection_userId_idx`(`userId`),
    UNIQUE INDEX `PlatformConnection_userId_spotwareUserId_key`(`userId`, `spotwareUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `platformAccountId` BIGINT NOT NULL,
    `restTradingAccountId` BIGINT NULL,
    `isLive` BOOLEAN NOT NULL,
    `brokerName` VARCHAR(191) NULL,
    `traderLogin` VARCHAR(191) NULL,
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSyncAt` DATETIME(3) NULL,
    `depositCurrency` VARCHAR(191) NULL,
    `balance` DOUBLE NULL,
    `equity` DOUBLE NULL,
    `instrumentCategory` VARCHAR(191) NULL DEFAULT 'Multi',
    `positionMode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformAccount_userId_isLive_idx`(`userId`, `isLive`),
    INDEX `PlatformAccount_connectionId_idx`(`connectionId`),
    INDEX `PlatformAccount_traderLogin_idx`(`traderLogin`),
    UNIQUE INDEX `PlatformAccount_connectionId_platformAccountId_key`(`connectionId`, `platformAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trade` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platformAccountId` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT '',
    `symbol` VARCHAR(191) NOT NULL,
    `symbolId` INTEGER NULL,
    `direction` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NULL,
    `quantityLots` DOUBLE NULL,
    `entryTime` DATETIME(3) NULL,
    `exitTime` DATETIME(3) NULL,
    `entryPrice` DOUBLE NULL,
    `exitPrice` DOUBLE NULL,
    `result` DOUBLE NULL,
    `durationMs` BIGINT NULL,
    `durationLabel` VARCHAR(191) NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `positionId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `dealStatus` INTEGER NULL,
    `tradeSide` INTEGER NULL,
    `createTimestampMs` BIGINT NULL,
    `executionTimestampMs` BIGINT NULL,
    `utcLastUpdateTimestampMs` BIGINT NULL,
    `executionPrice` DOUBLE NULL,
    `marginRate` DOUBLE NULL,
    `commission` DOUBLE NULL,
    `baseToUsdRate` DOUBLE NULL,
    `moneyDigits` INTEGER NULL,
    `comment` VARCHAR(191) NULL,
    `cpd_entryPrice` DOUBLE NULL,
    `cpd_grossProfit` DOUBLE NULL,
    `cpd_swap` DOUBLE NULL,
    `cpd_commission` DOUBLE NULL,
    `cpd_balance` DOUBLE NULL,
    `cpd_quoteToDepositRate` DOUBLE NULL,
    `cpd_closedVolume` DOUBLE NULL,
    `cpd_balanceVersion` INTEGER NULL,
    `cpd_pnlConversionFee` DOUBLE NULL,
    `positionStatus` INTEGER NULL,
    `positionSwap` DOUBLE NULL,
    `positionPrice` DOUBLE NULL,
    `stopLoss` DECIMAL(18, 10) NULL,
    `takeProfit` DECIMAL(18, 10) NULL,
    `positionUtcLastUpdateMs` BIGINT NULL,
    `positionCommission` DOUBLE NULL,
    `positionMarginRate` DOUBLE NULL,
    `mirroringCommission` DOUBLE NULL,
    `guaranteedStopLoss` BOOLEAN NULL,
    `usedMargin` DOUBLE NULL,
    `stopLossTriggerMethod` INTEGER NULL,
    `positionMoneyDigits` INTEGER NULL,
    `trailingStopLoss` BOOLEAN NULL,
    `td_symbolId` INTEGER NULL,
    `td_volume` DOUBLE NULL,
    `td_tradeSide` INTEGER NULL,
    `td_openTimestampMs` BIGINT NULL,
    `td_comment` VARCHAR(191) NULL,
    `td_measurementUnits` VARCHAR(191) NULL,
    `quoteToDepositRate` DOUBLE NULL,
    `rawDeal` JSON NULL,
    `rawPosition` JSON NULL,
    `notes` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Trade_userId_positionId_exitTime_idx`(`userId`, `positionId`, `exitTime`),
    INDEX `Trade_userId_platform_status_symbol_entryTime_idx`(`userId`, `platform`, `status`, `symbol`, `entryTime`),
    INDEX `Trade_positionId_idx`(`positionId`),
    INDEX `Trade_symbolId_idx`(`symbolId`),
    UNIQUE INDEX `Trade_userId_ticketId_key`(`userId`, `ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAiReport` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platformAccountId` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `autoUpdateFrequencyDays` INTEGER NOT NULL DEFAULT 7,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `strengths` JSON NOT NULL,
    `areasForImprovement` JSON NOT NULL,
    `actionableRecommendations` JSON NOT NULL,

    INDEX `PlatformAiReport_userId_platformAccountId_identifier_idx`(`userId`, `platformAccountId`, `identifier`),
    UNIQUE INDEX `PlatformAiReport_userId_platformAccountId_identifier_key`(`userId`, `platformAccountId`, `identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `googleId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL DEFAULT 'https://recapfy-store.s3.us-east-1.amazonaws.com/profile_pic.jpg',
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `hasAccess` BOOLEAN NOT NULL DEFAULT false,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_googleId_key`(`googleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OTP` (
    `id` VARCHAR(191) NOT NULL,
    `otp` INTEGER NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `OTP_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformConnection` ADD CONSTRAINT `PlatformConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAccount` ADD CONSTRAINT `fk_platformconnection_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAccount` ADD CONSTRAINT `PlatformAccount_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `PlatformConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_platformAccountId_fkey` FOREIGN KEY (`platformAccountId`) REFERENCES `PlatformAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAiReport` ADD CONSTRAINT `PlatformAiReport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAiReport` ADD CONSTRAINT `PlatformAiReport_platformAccountId_fkey` FOREIGN KEY (`platformAccountId`) REFERENCES `PlatformAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OTP` ADD CONSTRAINT `OTP_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
