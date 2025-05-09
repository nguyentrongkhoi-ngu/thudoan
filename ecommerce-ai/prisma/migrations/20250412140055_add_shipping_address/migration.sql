BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Order] ADD [notes] TEXT,
[paymentMethod] NVARCHAR(1000),
[trackingNumber] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[ShippingAddress] (
    [id] NVARCHAR(1000) NOT NULL,
    [orderId] NVARCHAR(1000) NOT NULL,
    [fullName] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    [city] NVARCHAR(1000) NOT NULL,
    [state] NVARCHAR(1000),
    [postalCode] NVARCHAR(1000),
    [country] NVARCHAR(1000) NOT NULL,
    [phoneNumber] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ShippingAddress_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ShippingAddress_orderId_key] UNIQUE NONCLUSTERED ([orderId])
);

-- AddForeignKey
ALTER TABLE [dbo].[ShippingAddress] ADD CONSTRAINT [ShippingAddress_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
