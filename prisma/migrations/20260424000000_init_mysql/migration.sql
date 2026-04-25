-- Full schema migration for MySQL / MariaDB
-- Covers all incremental SQLite migrations in one file

CREATE TABLE `Tournament` (
    `id`               VARCHAR(191) NOT NULL,
    `slug`             VARCHAR(191) NOT NULL,
    `adminToken`       VARCHAR(191) NOT NULL,
    `name`             VARCHAR(191) NOT NULL,
    `description`      VARCHAR(191) NULL,
    `format`           VARCHAR(191) NOT NULL,
    `status`           VARCHAR(191) NOT NULL DEFAULT 'draft',
    `matchFormat`      VARCHAR(191) NOT NULL DEFAULT 'B1',
    `thirdPlace`       BOOLEAN      NOT NULL DEFAULT false,
    `groupCount`       INTEGER      NULL,
    `advanceCount`     INTEGER      NULL,
    `isPublic`         BOOLEAN      NOT NULL DEFAULT false,
    `registrationOpen` BOOLEAN      NOT NULL DEFAULT false,
    `courtCount`       INTEGER      NULL,
    `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`        DATETIME(3)  NOT NULL,

    UNIQUE INDEX `Tournament_slug_key`(`slug`),
    UNIQUE INDEX `Tournament_adminToken_key`(`adminToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Player` (
    `id`           VARCHAR(191) NOT NULL,
    `name`         VARCHAR(191) NOT NULL,
    `player1Name`  VARCHAR(191) NOT NULL DEFAULT '',
    `player2Name`  VARCHAR(191) NOT NULL DEFAULT '',
    `seed`         INTEGER      NULL,
    `checkedIn`    BOOLEAN      NOT NULL DEFAULT true,
    `tournamentId` VARCHAR(191) NOT NULL,
    `groupIndex`   INTEGER      NULL,

    INDEX `Player_tournamentId_idx`(`tournamentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Match` (
    `id`               VARCHAR(191) NOT NULL,
    `tournamentId`     VARCHAR(191) NOT NULL,
    `round`            INTEGER      NOT NULL,
    `position`         INTEGER      NOT NULL,
    `bracketType`      VARCHAR(191) NOT NULL DEFAULT 'winners',
    `groupIndex`       INTEGER      NULL,
    `team1Id`          VARCHAR(191) NULL,
    `team2Id`          VARCHAR(191) NULL,
    `winnerId`         VARCHAR(191) NULL,
    `scores`           TEXT         NULL,
    `scheduledAt`      DATETIME(3)  NULL,
    `court`            VARCHAR(191) NULL,
    `status`           VARCHAR(191) NOT NULL DEFAULT 'pending',
    `nextMatchId`      VARCHAR(191) NULL,
    `nextMatchSlot`    INTEGER      NULL,
    `loserNextMatchId` VARCHAR(191) NULL,
    `loserNextSlot`    INTEGER      NULL,
    `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`        DATETIME(3)  NOT NULL,

    INDEX `Match_tournamentId_idx`(`tournamentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Registration` (
    `id`           VARCHAR(191) NOT NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `player1Name`  VARCHAR(191) NOT NULL,
    `player2Name`  VARCHAR(191) NOT NULL,
    `teamName`     VARCHAR(191) NULL,
    `contact`      VARCHAR(191) NULL,
    `status`       VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Registration_tournamentId_idx`(`tournamentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Player`
    ADD CONSTRAINT `Player_tournamentId_fkey`
    FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Match`
    ADD CONSTRAINT `Match_tournamentId_fkey`
    FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Match`
    ADD CONSTRAINT `Match_team1Id_fkey`
    FOREIGN KEY (`team1Id`) REFERENCES `Player`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Match`
    ADD CONSTRAINT `Match_team2Id_fkey`
    FOREIGN KEY (`team2Id`) REFERENCES `Player`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Match`
    ADD CONSTRAINT `Match_winnerId_fkey`
    FOREIGN KEY (`winnerId`) REFERENCES `Player`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Registration`
    ADD CONSTRAINT `Registration_tournamentId_fkey`
    FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
