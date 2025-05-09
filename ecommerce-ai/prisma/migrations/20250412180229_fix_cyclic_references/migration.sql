BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ReturnRequest] (
    [id] NVARCHAR(1000) NOT NULL,
    [orderId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ReturnRequest_status_df] DEFAULT 'PENDING',
    [reason] TEXT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReturnRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ReturnRequest_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ReturnItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [returnRequestId] NVARCHAR(1000) NOT NULL,
    [orderItemId] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL,
    [reason] TEXT,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ReturnItem_status_df] DEFAULT 'PENDING',
    CONSTRAINT [ReturnItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Invoice] (
    [id] NVARCHAR(1000) NOT NULL,
    [orderId] NVARCHAR(1000) NOT NULL,
    [invoiceNumber] NVARCHAR(1000) NOT NULL,
    [pdfUrl] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Invoice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Invoice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Invoice_orderId_key] UNIQUE NONCLUSTERED ([orderId]),
    CONSTRAINT [Invoice_invoiceNumber_key] UNIQUE NONCLUSTERED ([invoiceNumber])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReturnRequest_orderId_idx] ON [dbo].[ReturnRequest]([orderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReturnRequest_userId_idx] ON [dbo].[ReturnRequest]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReturnItem_returnRequestId_idx] ON [dbo].[ReturnItem]([returnRequestId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReturnItem_orderItemId_idx] ON [dbo].[ReturnItem]([orderItemId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_invoiceNumber_idx] ON [dbo].[Invoice]([invoiceNumber]);

-- AddForeignKey
ALTER TABLE [dbo].[ReturnRequest] ADD CONSTRAINT [ReturnRequest_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReturnRequest] ADD CONSTRAINT [ReturnRequest_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReturnItem] ADD CONSTRAINT [ReturnItem_returnRequestId_fkey] FOREIGN KEY ([returnRequestId]) REFERENCES [dbo].[ReturnRequest]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
