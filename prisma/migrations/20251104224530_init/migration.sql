-- CreateTable
CREATE TABLE `User` (
    `idUser` INTEGER NOT NULL AUTO_INCREMENT,
    `nomUser` VARCHAR(191) NOT NULL,
    `prenomUser` VARCHAR(191) NOT NULL,
    `mailUser` VARCHAR(191) NOT NULL,
    `dateInscrUser` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `photoUser` VARCHAR(191) NULL,
    `modePrefUser` VARCHAR(191) NULL,
    `perimPrefUser` INTEGER NULL,
    `role` ENUM('CLIENT', 'PRESTATAIRE', 'ADMIN') NOT NULL DEFAULT 'CLIENT',

    UNIQUE INDEX `User_mailUser_key`(`mailUser`),
    PRIMARY KEY (`idUser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Annonce` (
    `idAnnonce` INTEGER NOT NULL AUTO_INCREMENT,
    `nomAnnonce` VARCHAR(191) NOT NULL,
    `typeAnnonce` VARCHAR(191) NOT NULL,
    `datePublication` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lieuAnnonce` VARCHAR(191) NOT NULL,
    `prixAnnonce` DOUBLE NOT NULL,
    `descAnnonce` VARCHAR(191) NULL,
    `userCreateurId` INTEGER NOT NULL,

    PRIMARY KEY (`idAnnonce`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhotoAnnonce` (
    `idPhotoAnnonce` INTEGER NOT NULL AUTO_INCREMENT,
    `urlPhoto` VARCHAR(191) NOT NULL,
    `annonceId` INTEGER NOT NULL,

    PRIMARY KEY (`idPhotoAnnonce`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Creneau` (
    `idCreneau` INTEGER NOT NULL AUTO_INCREMENT,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NOT NULL,
    `estReserve` BOOLEAN NOT NULL DEFAULT false,
    `annonceId` INTEGER NOT NULL,

    PRIMARY KEY (`idCreneau`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `idResa` INTEGER NOT NULL AUTO_INCREMENT,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NOT NULL,
    `statusResa` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `annonceId` INTEGER NOT NULL,

    PRIMARY KEY (`idResa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `idConversation` INTEGER NOT NULL AUTO_INCREMENT,
    `annonceId` INTEGER NOT NULL,

    PRIMARY KEY (`idConversation`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `idMessage` INTEGER NOT NULL AUTO_INCREMENT,
    `contenu` VARCHAR(191) NOT NULL,
    `dateMessage` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estLu` BOOLEAN NOT NULL DEFAULT false,
    `conversationId` INTEGER NOT NULL,

    PRIMARY KEY (`idMessage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_in_Conversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Annonce_Favorite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `annonceId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Avis` (
    `idAvis` INTEGER NOT NULL AUTO_INCREMENT,
    `noteAvis` DOUBLE NOT NULL,
    `commentaire` VARCHAR(191) NULL,
    `dateAvis` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `annonceId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`idAvis`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Annonce` ADD CONSTRAINT `Annonce_userCreateurId_fkey` FOREIGN KEY (`userCreateurId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoAnnonce` ADD CONSTRAINT `PhotoAnnonce_annonceId_fkey` FOREIGN KEY (`annonceId`) REFERENCES `Annonce`(`idAnnonce`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Creneau` ADD CONSTRAINT `Creneau_annonceId_fkey` FOREIGN KEY (`annonceId`) REFERENCES `Annonce`(`idAnnonce`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_annonceId_fkey` FOREIGN KEY (`annonceId`) REFERENCES `Annonce`(`idAnnonce`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_annonceId_fkey` FOREIGN KEY (`annonceId`) REFERENCES `Annonce`(`idAnnonce`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`idConversation`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_in_Conversation` ADD CONSTRAINT `User_in_Conversation_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`idConversation`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_in_Conversation` ADD CONSTRAINT `User_in_Conversation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Annonce_Favorite` ADD CONSTRAINT `Annonce_Favorite_annonceId_fkey` FOREIGN KEY (`annonceId`) REFERENCES `Annonce`(`idAnnonce`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Annonce_Favorite` ADD CONSTRAINT `Annonce_Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avis` ADD CONSTRAINT `Avis_annonceId_fkey` FOREIGN KEY (`annonceId`) REFERENCES `Annonce`(`idAnnonce`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avis` ADD CONSTRAINT `Avis_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;
