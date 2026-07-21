CREATE TYPE "public"."domain" AS ENUM('cinema', 'musique', 'bouffe', 'lieu', 'livre', 'jeu', 'objet', 'sport', 'abstrait');--> statement-breakpoint
CREATE TYPE "public"."entity_status" AS ENUM('active', 'merged', 'quarantine');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('work', 'creator', 'track', 'album', 'artist', 'dish', 'cuisine', 'ingredient', 'place_type', 'place', 'object', 'brand', 'activity', 'club', 'axis_pair');--> statement-breakpoint
CREATE TYPE "public"."judgment_kind" AS ENUM('duel', 'sort', 'verdict', 'axis');--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "entity_type" NOT NULL,
	"domain" "domain" NOT NULL,
	"canonical_name" text NOT NULL,
	"parent_id" uuid,
	"level" smallint DEFAULT 1 NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"blocking_key" text,
	"embedding" vector(768),
	"popularity" real DEFAULT 0 NOT NULL,
	"quality_score" real DEFAULT 0.5 NOT NULL,
	"status" "entity_status" DEFAULT 'quarantine' NOT NULL,
	"merged_into" uuid,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judgments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"kind" "judgment_kind" NOT NULL,
	"value" jsonb NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_entity_scores" (
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"domain" "domain" NOT NULL,
	"rating" real DEFAULT 1500 NOT NULL,
	"rd" real DEFAULT 350 NOT NULL,
	"games" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_entity_scores_user_id_entity_id_pk" PRIMARY KEY("user_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_parent_id_entities_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judgments" ADD CONSTRAINT "judgments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judgments" ADD CONSTRAINT "judgments_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_scores" ADD CONSTRAINT "user_entity_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_scores" ADD CONSTRAINT "user_entity_scores_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entities_domain_status_idx" ON "entities" USING btree ("domain","status");--> statement-breakpoint
CREATE INDEX "entities_type_idx" ON "entities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "entities_blocking_key_idx" ON "entities" USING btree ("blocking_key");--> statement-breakpoint
CREATE INDEX "entities_popularity_idx" ON "entities" USING btree ("popularity");--> statement-breakpoint
CREATE INDEX "entities_parent_idx" ON "entities" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "entities_embedding_idx" ON "entities" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "judgments_user_entity_idx" ON "judgments" USING btree ("user_id","entity_id");--> statement-breakpoint
CREATE INDEX "judgments_user_created_idx" ON "judgments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "scores_user_domain_rating_idx" ON "user_entity_scores" USING btree ("user_id","domain","rating");