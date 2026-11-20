CREATE UNIQUE INDEX "account_provider_accountId_uidx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;--> statement-breakpoint
DROP INDEX "account_issuer_accountId_uidx";
