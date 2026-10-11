CREATE TABLE "source_sessions" (
	"user_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"expired_at" timestamp with time zone,
	CONSTRAINT "source_sessions_user_id_source_id_pk" PRIMARY KEY("user_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "source_sessions" ADD CONSTRAINT "source_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_sessions" ADD CONSTRAINT "source_sessions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;