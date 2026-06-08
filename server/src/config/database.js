import { Sequelize } from 'sequelize';
import { env } from './env.js';
const getDatabaseConfig = () => {
    // Use DATABASE_URL if available (for production/cloud deployments)
    if (env.DATABASE_URL) {
        const config = {
            dialect: 'postgres',
            logging: false,
            pool: {
                max: env.DB_POOL_MAX,
                min: env.DB_POOL_MIN,
                acquire: env.DB_POOL_ACQUIRE_MS,
                idle: env.DB_POOL_IDLE_MS,
            },
            define: {
                timestamps: true,
                underscored: true,
                paranoid: false,
            },
            dialectOptions: env.NODE_ENV === 'production' ? {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            } : {},
        };
        return config;
    }
    // Use individual credentials for development
    const config = {
        dialect: 'postgres',
        logging: false,
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        username: env.DB_USER,
        password: env.DB_PASSWORD,
        pool: {
            max: env.DB_POOL_MAX,
            min: env.DB_POOL_MIN,
            acquire: env.DB_POOL_ACQUIRE_MS,
            idle: env.DB_POOL_IDLE_MS,
        },
        define: {
            timestamps: true,
            underscored: true,
            paranoid: false,
        },
    };
    return config;
};
// Create Sequelize instance
const sequelizeConfig = getDatabaseConfig();
export const sequelize = env.DATABASE_URL
    ? new Sequelize(env.DATABASE_URL, sequelizeConfig)
    : new Sequelize(sequelizeConfig);
// Test database connection
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
    }
    catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        throw error;
    }
};
// Sync database (use with caution in production)
export const syncDatabase = async (force = false) => {
    try {
        // ─── Dev pre-sync migration ────────────────────────────────────────
        // Drop legacy columns that were renamed so ALTER TABLE doesn't conflict.
        // These queries are idempotent (IF EXISTS) and only run in development.
        if (env.NODE_ENV === 'development' && !force) {
            await sequelize.query(`
                ALTER TABLE IF EXISTS "properties"
                    DROP COLUMN IF EXISTS "price";
            `);
            // Add new profile.gender enum value for existing PostgreSQL databases
            await sequelize.query(`
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT 1 FROM pg_type t
                        WHERE t.typname = 'enum_profiles_gender'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'enum_profiles_gender'
                          AND e.enumlabel = 'PREFER_NOT_TO_SAY'
                    ) THEN
                        ALTER TYPE enum_profiles_gender ADD VALUE 'PREFER_NOT_TO_SAY';
                    END IF;
                END $$;
            `);
            // Add new property.status enum values
            await sequelize.query(`
                DO $$ BEGIN
                    -- Check and add DRAFT
                    IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'enum_properties_status') AND NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_properties_status' AND e.enumlabel = 'DRAFT') THEN ALTER TYPE enum_properties_status ADD VALUE 'DRAFT'; END IF;
                    -- Check and add PENDING_APPROVAL
                    IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'enum_properties_status') AND NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_properties_status' AND e.enumlabel = 'PENDING_APPROVAL') THEN ALTER TYPE enum_properties_status ADD VALUE 'PENDING_APPROVAL'; END IF;
                    -- Check and add AVAILABLE
                    IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'enum_properties_status') AND NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_properties_status' AND e.enumlabel = 'AVAILABLE') THEN ALTER TYPE enum_properties_status ADD VALUE 'AVAILABLE'; END IF;
                    -- Check and add REJECTED
                    IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'enum_properties_status') AND NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_properties_status' AND e.enumlabel = 'REJECTED') THEN ALTER TYPE enum_properties_status ADD VALUE 'REJECTED'; END IF;
                    -- Check and add RENTED
                    IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'enum_properties_status') AND NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'enum_properties_status' AND e.enumlabel = 'RENTED') THEN ALTER TYPE enum_properties_status ADD VALUE 'RENTED'; END IF;
                END $$;
            `);
            await sequelize.query(`
                ALTER TABLE IF EXISTS "profiles"
                    ADD COLUMN IF NOT EXISTS "current_location" VARCHAR(255);
            `);
            // ── Rental requests: replace the legacy (tenant_id, property_id)
            //    unique constraint with a PARTIAL unique index so tenants can
            //    re-apply after a previous request was declined or after a
            //    contract has ended. The constraint must only fire for the
            //    in-flight PENDING row.
            await sequelize.query(`
                DO $$
                BEGIN
                    IF to_regclass('public.rental_requests') IS NOT NULL THEN
                        ALTER TABLE "rental_requests"
                            DROP CONSTRAINT IF EXISTS "unique_tenant_property_request";
                        DROP INDEX IF EXISTS "unique_tenant_property_request";
                        CREATE UNIQUE INDEX IF NOT EXISTS "uniq_pending_rental_request_per_tenant_property"
                        ON "rental_requests" ("tenant_id", "property_id")
                        WHERE "status" = 'PENDING';
                    END IF;
                END $$;
            `);
            // ── Safely drop any stale FK constraints that Sequelize alter-mode
            //    may try to recreate, causing SequelizeUnknownConstraintError.
            //    Each block is fully idempotent — safe to run on every startup.
            await sequelize.query(`
                DO $$ 
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN
                        SELECT tc.table_name, tc.constraint_name
                        FROM information_schema.table_constraints tc
                        WHERE tc.constraint_type = 'FOREIGN KEY'
                          AND tc.table_name IN (
                              'profiles', 'contracts', 'properties',
                              'property_images', 'property_specifications',
                              'property_detailed_locations', 'property_ownership_docs',
                              'rental_requests', 'saved_properties',
                              'property_amenities', 'property_house_rules',
                              'messages', 'conversations', 'payment_methods', 'notifications',
                              'maintenance_requests', 'maintenance_job_applications',
                              'maintenance_locations', 'maintenance_conflicts',
                              'maintenance_ratings', 'landlord_maintenance_charges',
                              'maintenance_provider_applications',
                              'roommate_matches', 'roommate_requests',
                              'activity_logs', 'user_passkeys', 'webauthn_challenges'
                          )
                    LOOP
                        EXECUTE format(
                            'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                            r.table_name, r.constraint_name
                        );
                    END LOOP;
                END $$;
            `);
        }
        // Onboarding / rental preferences (profiles) — all environments, idempotent
        await sequelize.query(`
            ALTER TABLE IF EXISTS "profiles"
                ADD COLUMN IF NOT EXISTS "preferred_language" VARCHAR(10),
                ADD COLUMN IF NOT EXISTS "tenant_rental_preferences" JSONB,
                ADD COLUMN IF NOT EXISTS "landlord_business_profile" JSONB,
                ADD COLUMN IF NOT EXISTS "onboarding_step3_skipped" BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS "onboarding_step3_completed" BOOLEAN NOT NULL DEFAULT false;
        `);
        await sequelize.query(`
            UPDATE profiles p
            SET onboarding_step3_completed = true
            FROM users u
            WHERE u.id = p.user_id
              AND (
                (u.role = 'TENANT' AND p.preferred_budget_min IS NOT NULL)
                OR (u.role = 'LANDLORD' AND p.bio IS NOT NULL AND length(trim(p.bio)) > 0)
              )
              AND p.onboarding_step3_completed = false
              AND p.onboarding_step3_skipped = false;
        `);
        await sequelize.query(`
            UPDATE users u
            SET is_verified = EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.user_id = u.id
                  AND p.onboarding_step3_completed = true
                  AND p.national_id IS NOT NULL
                  AND p.gender IS NOT NULL
                  AND p.birthdate IS NOT NULL
            )
            WHERE u.role IN ('TENANT', 'LANDLORD');
        `);
        await sequelize.query(`
            ALTER TABLE IF EXISTS "profiles"
                ADD COLUMN IF NOT EXISTS "onboarding_step2_completed" BOOLEAN NOT NULL DEFAULT true;
        `);
        await sequelize.sync({ force, alter: env.NODE_ENV === 'development' });
        // ─── WebAuthn / passkey tables (idempotent; required when alter: false in production) ─
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "user_passkeys" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "credential_id" VARCHAR(512) NOT NULL UNIQUE,
                "public_key" TEXT NOT NULL,
                "counter" BIGINT NOT NULL DEFAULT 0,
                "transports" JSONB,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "user_passkeys_user_id" ON "user_passkeys" ("user_id");
        `);
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "challenge" TEXT NOT NULL,
                "kind" VARCHAR(32) NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "webauthn_challenges_user_kind" ON "webauthn_challenges" ("user_id", "kind");
        `);
        await sequelize.query(`
            ALTER TABLE IF EXISTS "conversations"
                ADD COLUMN IF NOT EXISTS "is_support" BOOLEAN NOT NULL DEFAULT false;
        `);
        await sequelize.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_type t
                    WHERE t.typname = 'enum_users_role'
                ) AND NOT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'enum_users_role'
                      AND e.enumlabel = 'MAINTENANCE_PROVIDER'
                ) THEN
                    ALTER TYPE enum_users_role ADD VALUE 'MAINTENANCE_PROVIDER';
                END IF;
            END $$;
        `);
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "maintenance_provider_applications" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
                "provider_type" VARCHAR(32) NOT NULL,
                "business_name" VARCHAR(255),
                "category" VARCHAR(120) NOT NULL,
                "categories" JSONB,
                "criminal_record_document" TEXT,
                "selfie_image" TEXT,
                "national_id_front" TEXT,
                "national_id_back" TEXT,
                "number_of_employees" INTEGER,
                "company_location" VARCHAR(255),
                "documentation_files" JSONB,
                "notes" TEXT,
                "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
                "rejection_reason" TEXT,
                "reviewed_by_admin_id" UUID,
                "reviewed_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `);
        await sequelize.query(`
            ALTER TABLE IF EXISTS "maintenance_provider_applications"
                ADD COLUMN IF NOT EXISTS "selfie_image" TEXT,
                ADD COLUMN IF NOT EXISTS "national_id_front" TEXT,
                ADD COLUMN IF NOT EXISTS "national_id_back" TEXT;
        `);
        // Existing databases may have this column as VARCHAR with a text default.
        // PostgreSQL can fail when Sequelize later alters it to ENUM if default is still text.
        await sequelize.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'maintenance_provider_applications'
                      AND column_name = 'status'
                      AND udt_name <> 'enum_maintenance_provider_applications_status'
                ) THEN
                    ALTER TABLE "maintenance_provider_applications"
                        ALTER COLUMN "status" DROP DEFAULT;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_type t
                        WHERE t.typname = 'enum_maintenance_provider_applications_status'
                    ) THEN
                        CREATE TYPE "public"."enum_maintenance_provider_applications_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
                    END IF;

                    ALTER TABLE "maintenance_provider_applications"
                        ALTER COLUMN "status"
                        TYPE "public"."enum_maintenance_provider_applications_status"
                        USING ("status"::"public"."enum_maintenance_provider_applications_status");

                    ALTER TABLE "maintenance_provider_applications"
                        ALTER COLUMN "status" SET DEFAULT 'PENDING';
                END IF;
            END
            $$;
        `);
        await sequelize.query(`
            DO $$
            BEGIN
                IF to_regclass('"public"."conversations"') IS NOT NULL THEN
                    CREATE INDEX IF NOT EXISTS "conversations_is_support_last_message"
                        ON "conversations" ("is_support", "last_message_at")
                        WHERE "deleted_at" IS NULL;
                END IF;
            END $$;
        `);
        // ──────────────────────────────────────────────────────────────────
        // One DM thread per participant pair (legacy rows were split by property_id).
        try {
            const { messageService } = await import('../modules/messages/services/message.service.js');
            await messageService.mergeDuplicateConversations();
        }
        catch (mergeError) {
            console.warn('⚠️ Conversation merge skipped:', mergeError);
        }
        if (sequelize.getDialect() === 'postgres') {
            await sequelize.query(`
                DO $$
                BEGIN
                    IF to_regclass('"public"."conversations"') IS NOT NULL THEN
                        ALTER TABLE "conversations"
                            DROP CONSTRAINT IF EXISTS "uniq_conversation_participants_property";
                        DROP INDEX IF EXISTS "uniq_conversation_participants_property";
                        CREATE UNIQUE INDEX IF NOT EXISTS "uniq_conversation_participants_active"
                        ON "conversations" ("participant_one_id", "participant_two_id")
                        WHERE "deleted_at" IS NULL;
                    END IF;
                END $$;
            `);
        }
        console.log('✅ Database synchronized successfully.');
    }
    catch (error) {
        console.error('❌ Database synchronization failed:', error);
        throw error;
    }
};
export default sequelize;
