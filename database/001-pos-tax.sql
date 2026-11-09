-- Run on the existing RetailOnePOS database. Additive, safe to re-run; no DROP/DELETE.
-- Price excludes tax. Tax is calculated after invoice discount and snapshotted.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.Invoices', 'taxRate') IS NULL
    ALTER TABLE dbo.Invoices ADD taxRate DECIMAL(5,2) NOT NULL CONSTRAINT DF_POS_Invoice_TaxRate DEFAULT(0) WITH VALUES;
IF COL_LENGTH('dbo.Invoices', 'taxAmount') IS NULL
    ALTER TABLE dbo.Invoices ADD taxAmount DECIMAL(15,2) NOT NULL CONSTRAINT DF_POS_Invoice_TaxAmount DEFAULT(0) WITH VALUES;
COMMIT;
