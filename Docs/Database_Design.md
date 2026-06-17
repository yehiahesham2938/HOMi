# 🗄️ HOMi Database Design & Entity Relationship Diagram (ERD)

> **Document Type:** Database Schema Reference & Eraser.io Code
> **Target Engine:** PostgreSQL (Supabase)
> **ORM:** Sequelize (TypeScript)

This document contains the complete database design for the HOMi platform. It is structured to be parsed directly by AI Agents or copy-pasted into **Eraser.io** or **DBML** visualization tools to generate the Entity Relationship Diagram (ERD).

---

## 🎨 Eraser.io ERD Diagram-as-Code

Copy the code block below and paste it directly into an **Eraser.io** diagram (choose the "Diagram-as-Code" / ERD panel) or a **DBDiagram.io** window to render the interactive schema.

```dbml
Table activity_logs {
  id uuid [pk, default: `UUIDV4`]
  actor_user_id uuid
  actor_role varchar(50)
  actor_email varchar(255)
  action varchar(120) [not null]
  entity_type varchar(80) [not null]
  entity_id varchar(120)
  description text [not null]
  metadata jsonb
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table amenities {
  id uuid [pk, default: `UUIDV4`]
  name varchar(255) [unique, not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table contracts {
  id uuid [pk, default: `UUIDV4`]
  contract_id varchar(20) [unique, not null]
  lease_id varchar(20) [unique]
  rental_request_id uuid [not null]
  property_id uuid [not null]
  landlord_id uuid [not null]
  tenant_id uuid [not null]
  status enum [not null, default: `ContractStatus.PENDING_LANDLORD`]
  rent_amount decimal
  security_deposit decimal
  service_fee decimal [not null, default: `10.00`]
  payment_schedule enum [not null, default: `PaymentSchedule.MONTHLY`]
  rent_due_date timestamp
  late_fee_amount decimal
  max_occupants int
  move_in_date timestamp [not null]
  lease_duration_months int [not null]
  landlord_national_id varchar(500)
  property_registration_number varchar(100)
  landlord_signature_url varchar(500)
  landlord_signed_at timestamp
  tenant_national_id varchar(500)
  tenant_emergency_contact_name varchar(200)
  tenant_emergency_phone varchar(50)
  tenant_signature_url varchar(500)
  tenant_signed_at timestamp
  tenant_agreed_terms boolean [not null, default: `false`]
  payment_status enum [not null, default: `ContractPaymentStatus.PENDING`]
  payment_verified_at timestamp
  paymob_order_id int
  paymob_transaction_id int
  autopay_enabled boolean [not null, default: `false`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table contract_maintenance_responsibilities {
  id uuid [pk, default: `UUIDV4`]
  contract_id uuid [not null]
  area enum [not null]
  responsible_party enum [not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table conversations {
  id uuid [pk, default: `UUIDV4`]
  participant_one_id uuid [not null]
  participant_two_id uuid [not null]
  property_id uuid
  is_support boolean [not null, default: `false`]
  last_message_at timestamp [default: `null`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
  deleted_at timestamp
}

Table habits {
  id uuid [pk, default: `UUIDV4`]
  name varchar(255) [unique, not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table house_rules {
  id uuid [pk, default: `UUIDV4`]
  name varchar(255) [unique, not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table landlord_maintenance_charges {
  id uuid [pk, default: `UUIDV4`]
  request_id uuid [not null]
  contract_id uuid [not null]
  landlord_id uuid [not null]
  tenant_id uuid [not null]
  amount decimal [not null]
  status enum [not null, default: `LandlordMaintenanceChargeStatus.PENDING`]
  applied_at timestamp
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table lease_termination_requests {
  id uuid [pk, default: `UUIDV4`]
  contract_id uuid [not null]
  requester_id uuid [not null]
  reason text [not null]
  scenario varchar [not null, default: `'LANDLORD_INITIATED'`]
  details text [not null, default: `''`]
  status enum [not null, default: `LeaseTerminationStatus.PENDING`]
  damage_deduction decimal
  mutual_deposit_option varchar
}

Table maintenance_conflicts {
  id uuid [pk, default: `UUIDV4`]
  request_id uuid [not null]
  opened_by_tenant_id uuid [not null]
  provider_id uuid [not null]
  tenant_reason text [not null]
  provider_completion_notes text
  status enum [not null, default: `MaintenanceConflictStatus.OPEN`]
  resolution enum [default: `null`]
  admin_notes text
  resolved_by_admin_id uuid
  resolved_at timestamp
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table maintenance_job_applications {
  id uuid [pk, default: `UUIDV4`]
  request_id uuid [not null]
  provider_id uuid [not null]
  final_price decimal [not null]
  price_breakdown text
  cover_note text
  eta_hours int
  status enum [not null, default: `MaintenanceJobApplicationStatus.PENDING`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table maintenance_locations {
  id uuid [pk, default: `UUIDV4`]
  request_id uuid [not null]
  provider_id uuid [not null]
  lat decimal [not null]
  lng decimal [not null]
  accuracy_m decimal
  heading decimal
  speed decimal
  reported_at timestamp [not null, default: `NOW`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table maintenance_provider_applications {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [unique, not null]
  provider_type enum [not null]
  business_name varchar(255)
  category varchar(120) [not null]
  categories jsonb
  criminal_record_document text
  selfie_image text
  national_id_front text
  national_id_back text
  number_of_employees int
  company_location varchar(255)
  documentation_files jsonb
  notes text
  status enum [not null, default: `MaintenanceApplicationStatus.PENDING`]
  rejection_reason text
  reviewed_by_admin_id uuid
  reviewed_at timestamp
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table maintenance_ratings {
  id uuid [pk, default: `UUIDV4`]
  request_id uuid [not null]
  tenant_id uuid [not null]
  provider_id uuid [not null]
  rating int [not null]
  comment text
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table maintenance_requests {
  id uuid [pk, default: `UUIDV4`]
  tenant_id uuid [not null]
  property_id uuid [not null]
  contract_id uuid
  landlord_id uuid [not null]
  assigned_provider_id uuid
  accepted_application_id uuid
  category varchar(120) [not null]
  title varchar(255) [not null]
  description text [not null]
  urgency enum [not null, default: `MaintenanceUrgency.MEDIUM`]
  estimated_budget decimal
  images jsonb [not null, default: `[]`]
  status enum [not null, default: `MaintenanceRequestStatus.OPEN`]
  charge_party enum [not null, default: `MaintenanceChargeParty.TENANT`]
  agreed_price decimal
  escrow_amount decimal [not null, default: `0`]
  completion_notes text
  completion_images jsonb [not null, default: `[]`]
  en_route_started_at timestamp
  in_progress_started_at timestamp
  provider_completed_at timestamp
  tenant_confirmed_at timestamp
  disputed_at timestamp
  disputed_reason text
  resolved_at timestamp
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table messages {
  id uuid [pk, default: `UUIDV4`]
  conversation_id uuid [not null]
  sender_id uuid [not null]
  body text [not null]
  read_at timestamp [default: `null`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table notifications {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [not null]
  type varchar(64) [not null]
  title varchar(255) [not null]
  body text [not null]
  related_entity_type varchar(64)
  related_entity_id varchar(64)
  data jsonb [not null, default: `{`]
  is_read boolean [not null, default: `false`]
  read_at timestamp
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table payment_methods {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [not null]
  provider enum [not null, default: `PaymentProvider.PAYMOB`]
  provider_payment_token varchar(255) [not null]
  brand varchar(40) [not null]
  last4 varchar(4) [not null]
  exp_month int [not null]
  exp_year int [not null]
  cardholder_name varchar(120) [not null]
  is_default boolean [not null, default: `false`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table profiles {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [unique, not null]
  first_name varchar(100) [not null]
  last_name varchar(100) [not null]
  phone_number varchar(20) [not null]
  bio text
  avatar_url text
  current_location varchar(255)
  e_signature_url text
  national_id varchar(500)
  gender enum
  birthdate timestamp
  gamification_points int [not null, default: `0`]
  preferred_budget_min decimal
  preferred_budget_max decimal
  wallet_balance decimal [not null, default: `0`]
  wallet_pending_order_id int
  wallet_pending_amount_cents int
  wallet_pending_save_card boolean [not null, default: `false`]
  preferred_language varchar(10)
  lifestyle_habits jsonb
  tenant_rental_preferences jsonb
  landlord_business_profile jsonb
  onboarding_step3_skipped boolean [not null, default: `false`]
  onboarding_step3_completed boolean [not null, default: `false`]
  onboarding_step2_completed boolean [not null, default: `false`]
  full_name_arabic text
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table properties {
  id uuid [pk, default: `UUIDV4`]
  landlord_id uuid [not null]
  title varchar(255) [not null]
  description text [not null]
  monthly_price decimal [default: `null`]
  security_deposit decimal [default: `null`]
  address text [not null]
  type enum [default: `null`]
  furnishing enum [default: `null`]
  status enum [not null, default: `PropertyStatus.DRAFT`]
  target_tenant enum [not null, default: `TargetTenant.ANY`]
  availability_date timestamp [default: `null`]
  maintenance_responsibilities jsonb [not null, default: `[]`]
  rejection_reason text
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
  deleted_at timestamp
}

Table property_amenities {
  property_id uuid [pk, not null]
  amenity_id uuid [pk, not null]
}

Table property_detailed_location {
  id uuid [pk, default: `UUIDV4`]
  property_id uuid [unique, not null]
  floor int [not null]
  city varchar(100) [not null]
  area varchar(100) [not null]
  street_name varchar(255) [not null]
  building_number varchar(50) [not null]
  unit_apt varchar(50) [not null]
  location_lat decimal [not null]
  location_long decimal [not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table property_house_rules {
  property_id uuid [pk, not null]
  house_rule_id uuid [pk, not null]
}

Table property_images {
  id uuid [pk, default: `UUIDV4`]
  property_id uuid [not null]
  image_url text [not null]
  is_main boolean [not null, default: `false`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table property_ownership_docs {
  id uuid [pk, default: `UUIDV4`]
  property_id uuid [not null]
  document_url text [not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table property_reports {
  id uuid [pk, default: `UUIDV4`]
  property_id uuid [not null]
  reporter_id uuid [not null]
  reason enum [not null]
  details text [not null]
  snapshot_property_title varchar(255)
  snapshot_property_address text
  snapshot_property_monthly_price decimal
  snapshot_property_thumbnail_url text
  snapshot_landlord_name varchar(255)
  snapshot_landlord_email varchar(255)
  status enum [not null, default: `PropertyReportStatus.OPEN`]
  reviewed_by_admin_id uuid
  reviewed_at timestamp
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table property_specifications {
  id uuid [pk, default: `UUIDV4`]
  property_id uuid [unique, not null]
  bedrooms int [not null]
  bathrooms int [not null]
  area_sqft decimal [not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table rental_requests {
  id uuid [pk, default: `UUIDV4`]
  tenant_id uuid [not null]
  property_id uuid [not null]
  move_in_date timestamp [not null]
  duration enum [not null]
  occupants int [not null]
  living_situation enum [not null]
  message text
  status enum [not null, default: `RentalRequestStatus.PENDING`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table roommate_matches {
  id uuid [pk, default: `UUIDV4`]
  request_id uuid
  matched_request_id uuid
  requester_id uuid [not null]
  matched_user_id uuid [not null]
  compatibility_score int [not null]
  ai_explanation text
  source enum [not null, default: `MatchSource.SMART`]
  status enum [not null, default: `MatchStatus.PENDING`]
  requester_action enum [not null, default: `UserMatchAction.NONE`]
  matched_user_action enum [not null, default: `UserMatchAction.NONE`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table roommate_requests {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [not null]
  type enum [not null]
  status enum [not null, default: `RoommateRequestStatus.ACTIVE`]
  contract_id uuid
  preferred_city varchar(100)
  preferred_area varchar(100)
  budget_min decimal
  budget_max decimal
  preferred_gender enum
  preferred_move_in_date timestamp
  additional_note text
  max_occupants int
  rooms_config jsonb
  expires_at timestamp [not null, default: `() => {`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table saved_properties {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [not null]
  property_id uuid [not null]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table tenant_reports {
  id uuid [pk, default: `UUIDV4`]
  contract_id uuid [not null]
  reporter_id uuid [not null]
  tenant_id uuid [not null]
  reason enum [not null]
  details text [not null]
  status enum [not null, default: `TenantReportStatus.OPEN`]
}

Table users {
  id uuid [pk, default: `UUIDV4`]
  email varchar(255) [unique, not null]
  password_hash varchar(255) [not null]
  role enum [not null]
  is_verified boolean [not null, default: `false`]
  reset_token_hash varchar(255)
  reset_token_expires timestamp
  email_verified boolean [not null, default: `false`]
  email_verification_token_hash varchar(255)
  email_verification_token_expires timestamp
  is_banned boolean [not null, default: `false`]
  ban_reason text
  ban_message text
  ban_until timestamp
  banned_by_admin_id uuid
  ban_created_at timestamp
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
  deleted_at timestamp
}

Table user_habits {
  user_id uuid [pk, not null]
  habit_id uuid [pk, not null]
}

Table user_passkeys {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [not null]
  credential_id varchar(512) [unique, not null]
  public_key text [not null]
  counter int [not null, default: `0`]
  transports jsonb
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table visit_bookings {
  id uuid [pk, default: `UUIDV4`]
  property_id uuid [not null]
  tenant_id uuid [not null]
  visit_date timestamp [not null]
  status enum [not null, default: `VisitBookingStatus.PENDING`]
  created_at timestamp [default: `NOW`]
  updated_at timestamp [default: `NOW`]
}

Table webauthn_challenges {
  id uuid [pk, default: `UUIDV4`]
  user_id uuid [not null]
  challenge text [not null]
  kind varchar(32) [not null]
  expires_at timestamp [not null]
  created_at timestamp [default: `NOW`]
}

// Relationships
users.id - profiles.user_id
users.id < user_habits.user_id
habits.id < user_habits.habit_id
users.id < user_passkeys.user_id
users.id < webauthn_challenges.user_id
rental_requests.id - contracts.rental_request_id
properties.id < contracts.property_id
users.id < contracts.landlord_id
users.id < contracts.tenant_id
contracts.id < contract_maintenance_responsibilities.contract_id
contracts.id < tenant_reports.contract_id
users.id < tenant_reports.reporter_id
users.id < tenant_reports.tenant_id
contracts.id < lease_termination_requests.contract_id
users.id < lease_termination_requests.requester_id
users.id - maintenance_provider_applications.user_id
users.id < maintenance_requests.tenant_id
users.id < maintenance_requests.landlord_id
users.id < maintenance_requests.assigned_provider_id
properties.id < maintenance_requests.property_id
contracts.id < maintenance_requests.contract_id
maintenance_requests.id < maintenance_job_applications.request_id
users.id < maintenance_job_applications.provider_id
maintenance_requests.id - maintenance_locations.request_id
users.id < maintenance_locations.provider_id
maintenance_requests.id - maintenance_conflicts.request_id
users.id < maintenance_conflicts.opened_by_tenant_id
users.id < maintenance_conflicts.provider_id
users.id < maintenance_conflicts.resolved_by_admin_id
maintenance_requests.id - maintenance_ratings.request_id
users.id < maintenance_ratings.provider_id
users.id < maintenance_ratings.tenant_id
maintenance_requests.id < landlord_maintenance_charges.request_id
contracts.id < landlord_maintenance_charges.contract_id
users.id < landlord_maintenance_charges.landlord_id
users.id < landlord_maintenance_charges.tenant_id
users.id < conversations.participant_one_id
users.id < conversations.participant_two_id
properties.id < conversations.property_id
conversations.id < messages.conversation_id
users.id < messages.sender_id
users.id < properties.landlord_id
properties.id < property_images.property_id
properties.id < property_ownership_docs.property_id
properties.id - property_specifications.property_id
properties.id - property_detailed_locations.property_id
properties.id < property_amenities.property_id
amenities.id < property_amenities.amenity_id
properties.id < property_house_rules.property_id
house_rules.id < property_house_rules.house_rule_id
properties.id < property_reports.property_id
users.id < property_reports.reporter_id
users.id < property_reports.reviewed_by_admin_id
properties.id < visit_bookings.property_id
users.id < visit_bookings.tenant_id
users.id < rental_requests.tenant_id
properties.id < rental_requests.property_id
users.id < roommate_requests.user_id
contracts.id < roommate_requests.contract_id
roommate_requests.id < roommate_matches.request_id
roommate_requests.id < roommate_matches.matched_request_id
users.id < roommate_matches.requester_id
users.id < roommate_matches.matched_user_id
users.id < saved_properties.user_id
properties.id < saved_properties.property_id
users.id < notifications.user_id
users.id < payment_methods.user_id
users.id < activity_logs.actor_user_id
```

---

## 🗂️ Detailed Schema Documentation

Below is the comprehensive list of tables, columns, constraints, and data types derived from the Sequelize source code.

### 📄 Table: `activity_logs` (ActivityLog Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `actor_user_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `actor_role` | `STRING(50)` |  | ✅ | NULL |  |
| `actor_email` | `STRING(255)` |  | ✅ | NULL |  |
| `action` | `STRING(120)` |  | ❌ | NULL |  |
| `entity_type` | `STRING(80)` |  | ❌ | NULL |  |
| `entity_id` | `STRING(120)` |  | ✅ | NULL | FOREIGN KEY |
| `description` | `TEXT` |  | ❌ | NULL |  |
| `metadata` | `JSONB` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `amenities` (Amenity Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `name` | `STRING(255)` |  | ❌ | NULL | UNIQUE |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `contracts` (Contract Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `contract_id` | `STRING(20)` |  | ❌ | NULL | UNIQUE |
| `lease_id` | `STRING(20)` |  | ✅ | NULL | UNIQUE |
| `rental_request_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `landlord_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `status` | `ENUM(...Object.values(ContractStatus))` |  | ❌ | `ContractStatus.PENDING_LANDLORD` |  |
| `rent_amount` | `DECIMAL(10, 2)` |  | ✅ | NULL |  |
| `security_deposit` | `DECIMAL(10, 2)` |  | ✅ | NULL |  |
| `service_fee` | `DECIMAL(10, 2)` |  | ❌ | `10.00` |  |
| `payment_schedule` | `ENUM(...Object.values(PaymentSchedule))` |  | ❌ | `PaymentSchedule.MONTHLY` |  |
| `rent_due_date` | `ENUM(...Object.values(RentDueDate))` |  | ✅ | NULL |  |
| `late_fee_amount` | `DECIMAL(10, 2)` |  | ✅ | NULL |  |
| `max_occupants` | `INTEGER` |  | ✅ | NULL |  |
| `move_in_date` | `DATEONLY` |  | ❌ | NULL |  |
| `lease_duration_months` | `INTEGER` |  | ❌ | NULL |  |
| `landlord_national_id` | `STRING(500)` |  | ✅ | NULL | FOREIGN KEY |
| `property_registration_number` | `STRING(100)` |  | ✅ | NULL |  |
| `landlord_signature_url` | `STRING(500)` |  | ✅ | NULL |  |
| `landlord_signed_at` | `DATE` |  | ✅ | NULL |  |
| `tenant_national_id` | `STRING(500)` |  | ✅ | NULL | FOREIGN KEY |
| `tenant_emergency_contact_name` | `STRING(200)` |  | ✅ | NULL |  |
| `tenant_emergency_phone` | `STRING(50)` |  | ✅ | NULL |  |
| `tenant_signature_url` | `STRING(500)` |  | ✅ | NULL |  |
| `tenant_signed_at` | `DATE` |  | ✅ | NULL |  |
| `tenant_agreed_terms` | `BOOLEAN` |  | ❌ | `false` |  |
| `payment_status` | `ENUM(...Object.values(ContractPaymentStatus))` |  | ❌ | `ContractPaymentStatus.PENDING` |  |
| `payment_verified_at` | `DATE` |  | ✅ | NULL |  |
| `paymob_order_id` | `BIGINT` |  | ✅ | NULL | FOREIGN KEY |
| `paymob_transaction_id` | `BIGINT` |  | ✅ | NULL | FOREIGN KEY |
| `autopay_enabled` | `BOOLEAN` |  | ❌ | `false` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `contract_maintenance_responsibilities` (ContractMaintenanceResponsibility Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `contract_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `area` | `ENUM(...Object.values(MaintenanceArea))` |  | ❌ | NULL |  |
| `responsible_party` | `ENUM(...Object.values(ResponsibleParty))` |  | ❌ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `conversations` (Conversation Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `participant_one_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `participant_two_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `property_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `is_support` | `BOOLEAN` |  | ❌ | `false` |  |
| `last_message_at` | `DATE` |  | ✅ | `null` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `deleted_at` | `DATE` |  | ✅ | NULL |  |

### 📄 Table: `habits` (Habit Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `name` | `STRING(255)` |  | ❌ | NULL | UNIQUE |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `house_rules` (HouseRule Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `name` | `STRING(255)` |  | ❌ | NULL | UNIQUE |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `landlord_maintenance_charges` (LandlordMaintenanceCharge Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `request_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `contract_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `landlord_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `amount` | `DECIMAL(12, 2)` |  | ❌ | NULL |  |
| `status` | `ENUM(...Object.values(LandlordMaintenanceChargeStatus))` |  | ❌ | `LandlordMaintenanceChargeStatus.PENDING` |  |
| `applied_at` | `DATE` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `lease_termination_requests` (LeaseTerminationRequest Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `contract_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `requester_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `reason` | `TEXT` |  | ❌ | NULL |  |
| `scenario` | `STRING` |  | ❌ | `'LANDLORD_INITIATED'` |  |
| `details` | `TEXT` |  | ❌ | `''` |  |
| `status` | `ENUM(...Object.values(LeaseTerminationStatus))` |  | ❌ | `LeaseTerminationStatus.PENDING` |  |
| `damage_deduction` | `DECIMAL(10, 2)` |  | ✅ | NULL |  |
| `mutual_deposit_option` | `STRING` |  | ✅ | NULL |  |

### 📄 Table: `maintenance_conflicts` (MaintenanceConflict Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `request_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `opened_by_tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `provider_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `tenant_reason` | `TEXT` |  | ❌ | NULL |  |
| `provider_completion_notes` | `TEXT` |  | ✅ | NULL |  |
| `status` | `ENUM(...Object.values(MaintenanceConflictStatus))` |  | ❌ | `MaintenanceConflictStatus.OPEN` |  |
| `resolution` | `ENUM(...Object.values(MaintenanceConflictResolution))` |  | ✅ | `null` |  |
| `admin_notes` | `TEXT` |  | ✅ | NULL |  |
| `resolved_by_admin_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `resolved_at` | `DATE` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `maintenance_job_applications` (MaintenanceJobApplication Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `request_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `provider_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `final_price` | `DECIMAL(12, 2)` |  | ❌ | NULL |  |
| `price_breakdown` | `TEXT` |  | ✅ | NULL |  |
| `cover_note` | `TEXT` |  | ✅ | NULL |  |
| `eta_hours` | `INTEGER` |  | ✅ | NULL |  |
| `status` | `ENUM(...Object.values(MaintenanceJobApplicationStatus))` |  | ❌ | `MaintenanceJobApplicationStatus.PENDING` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `maintenance_locations` (MaintenanceLocation Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `request_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `provider_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `lat` | `DOUBLE` |  | ❌ | NULL |  |
| `lng` | `DOUBLE` |  | ❌ | NULL |  |
| `accuracy_m` | `DOUBLE` |  | ✅ | NULL |  |
| `heading` | `DOUBLE` |  | ✅ | NULL |  |
| `speed` | `DOUBLE` |  | ✅ | NULL |  |
| `reported_at` | `DATE` |  | ❌ | `DataTypes.NOW` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `maintenance_provider_applications` (MaintenanceProviderApplication Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | UNIQUE |
| `provider_type` | `ENUM(...Object.values(MaintenanceProviderType))` |  | ❌ | NULL |  |
| `business_name` | `STRING(255)` |  | ✅ | NULL |  |
| `category` | `STRING(120)` |  | ❌ | NULL |  |
| `categories` | `JSONB` |  | ✅ | NULL |  |
| `criminal_record_document` | `TEXT` |  | ✅ | NULL |  |
| `selfie_image` | `TEXT` |  | ✅ | NULL |  |
| `national_id_front` | `TEXT` |  | ✅ | NULL |  |
| `national_id_back` | `TEXT` |  | ✅ | NULL |  |
| `number_of_employees` | `INTEGER` |  | ✅ | NULL |  |
| `company_location` | `STRING(255)` |  | ✅ | NULL |  |
| `documentation_files` | `JSONB` |  | ✅ | NULL |  |
| `notes` | `TEXT` |  | ✅ | NULL |  |
| `status` | `ENUM(...Object.values(MaintenanceApplicationStatus))` |  | ❌ | `MaintenanceApplicationStatus.PENDING` |  |
| `rejection_reason` | `TEXT` |  | ✅ | NULL |  |
| `reviewed_by_admin_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `reviewed_at` | `DATE` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `maintenance_ratings` (MaintenanceRating Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `request_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `provider_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `rating` | `INTEGER` |  | ❌ | NULL |  |
| `comment` | `TEXT` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `maintenance_requests` (MaintenanceRequest Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `contract_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `landlord_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `assigned_provider_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `accepted_application_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `category` | `STRING(120)` |  | ❌ | NULL |  |
| `title` | `STRING(255)` |  | ❌ | NULL |  |
| `description` | `TEXT` |  | ❌ | NULL |  |
| `urgency` | `ENUM(...Object.values(MaintenanceUrgency))` |  | ❌ | `MaintenanceUrgency.MEDIUM` |  |
| `estimated_budget` | `DECIMAL(12, 2)` |  | ✅ | NULL |  |
| `images` | `JSONB` |  | ❌ | `[]` |  |
| `status` | `ENUM(...Object.values(MaintenanceRequestStatus))` |  | ❌ | `MaintenanceRequestStatus.OPEN` |  |
| `charge_party` | `ENUM(...Object.values(MaintenanceChargeParty))` |  | ❌ | `MaintenanceChargeParty.TENANT` |  |
| `agreed_price` | `DECIMAL(12, 2)` |  | ✅ | NULL |  |
| `escrow_amount` | `DECIMAL(12, 2)` |  | ❌ | `0` |  |
| `completion_notes` | `TEXT` |  | ✅ | NULL |  |
| `completion_images` | `JSONB` |  | ❌ | `[]` |  |
| `en_route_started_at` | `DATE` |  | ✅ | NULL |  |
| `in_progress_started_at` | `DATE` |  | ✅ | NULL |  |
| `provider_completed_at` | `DATE` |  | ✅ | NULL |  |
| `tenant_confirmed_at` | `DATE` |  | ✅ | NULL |  |
| `disputed_at` | `DATE` |  | ✅ | NULL |  |
| `disputed_reason` | `TEXT` |  | ✅ | NULL |  |
| `resolved_at` | `DATE` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `messages` (Message Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `conversation_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `sender_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `body` | `TEXT` |  | ❌ | NULL |  |
| `read_at` | `DATE` |  | ✅ | `null` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `notifications` (Notification Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `type` | `STRING(64)` |  | ❌ | NULL |  |
| `title` | `STRING(255)` |  | ❌ | NULL |  |
| `body` | `TEXT` |  | ❌ | NULL |  |
| `related_entity_type` | `STRING(64)` |  | ✅ | NULL |  |
| `related_entity_id` | `STRING(64)` |  | ✅ | NULL | FOREIGN KEY |
| `data` | `JSONB` |  | ❌ | `{` |  |
| `is_read` | `BOOLEAN` |  | ❌ | `false` |  |
| `read_at` | `DATE` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `payment_methods` (PaymentMethod Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `provider` | `ENUM(...Object.values(PaymentProvider))` |  | ❌ | `PaymentProvider.PAYMOB` |  |
| `provider_payment_token` | `STRING(255)` |  | ❌ | NULL |  |
| `brand` | `STRING(40)` |  | ❌ | NULL |  |
| `last4` | `STRING(4)` |  | ❌ | NULL |  |
| `exp_month` | `INTEGER` |  | ❌ | NULL |  |
| `exp_year` | `INTEGER` |  | ❌ | NULL |  |
| `cardholder_name` | `STRING(120)` |  | ❌ | NULL |  |
| `is_default` | `BOOLEAN` |  | ❌ | `false` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `profiles` (Profile Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | UNIQUE |
| `first_name` | `STRING(100)` |  | ❌ | NULL |  |
| `last_name` | `STRING(100)` |  | ❌ | NULL |  |
| `phone_number` | `STRING(20)` |  | ❌ | NULL |  |
| `bio` | `TEXT` |  | ✅ | NULL |  |
| `avatar_url` | `TEXT` |  | ✅ | NULL |  |
| `current_location` | `STRING(255)` |  | ✅ | NULL |  |
| `e_signature_url` | `TEXT` |  | ✅ | NULL |  |
| `national_id` | `STRING(500)` |  | ✅ | NULL | FOREIGN KEY |
| `gender` | `ENUM(...Object.values(Gender))` |  | ✅ | NULL |  |
| `birthdate` | `DATEONLY` |  | ✅ | NULL |  |
| `gamification_points` | `INTEGER` |  | ❌ | `0` |  |
| `preferred_budget_min` | `DECIMAL(12, 2)` |  | ✅ | NULL |  |
| `preferred_budget_max` | `DECIMAL(12, 2)` |  | ✅ | NULL |  |
| `wallet_balance` | `DECIMAL(12, 2)` |  | ❌ | `0` |  |
| `wallet_pending_order_id` | `BIGINT` |  | ✅ | NULL | FOREIGN KEY |
| `wallet_pending_amount_cents` | `INTEGER` |  | ✅ | NULL |  |
| `wallet_pending_save_card` | `BOOLEAN` |  | ❌ | `false` |  |
| `preferred_language` | `STRING(10)` |  | ✅ | NULL |  |
| `lifestyle_habits` | `JSONB` |  | ✅ | NULL |  |
| `tenant_rental_preferences` | `JSONB` |  | ✅ | NULL |  |
| `landlord_business_profile` | `JSONB` |  | ✅ | NULL |  |
| `onboarding_step3_skipped` | `BOOLEAN` |  | ❌ | `false` |  |
| `onboarding_step3_completed` | `BOOLEAN` |  | ❌ | `false` |  |
| `onboarding_step2_completed` | `BOOLEAN` |  | ❌ | `false` |  |
| `full_name_arabic` | `TEXT` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `properties` (Property Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `landlord_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `title` | `STRING(255)` |  | ❌ | NULL |  |
| `description` | `TEXT` |  | ❌ | NULL |  |
| `monthly_price` | `DECIMAL(10, 2)` |  | ✅ | `null` |  |
| `security_deposit` | `DECIMAL(10, 2)` |  | ✅ | `null` |  |
| `address` | `TEXT` |  | ❌ | NULL |  |
| `type` | `ENUM(...Object.values(PropertyType))` |  | ✅ | `null` |  |
| `furnishing` | `ENUM(...Object.values(FurnishingStatus))` |  | ✅ | `null` |  |
| `status` | `ENUM(...Object.values(PropertyStatus))` |  | ❌ | `PropertyStatus.DRAFT` |  |
| `target_tenant` | `ENUM(...Object.values(TargetTenant))` |  | ❌ | `TargetTenant.ANY` |  |
| `availability_date` | `DATEONLY` |  | ✅ | `null` |  |
| `maintenance_responsibilities` | `JSONB` |  | ❌ | `[]` |  |
| `rejection_reason` | `TEXT` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `deleted_at` | `DATE` |  | ✅ | NULL |  |

### 📄 Table: `property_amenities` (PropertyAmenity Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `property_id` | `UUID` | ✅ | ❌ | NULL | PRIMARY KEY |
| `amenity_id` | `UUID` | ✅ | ❌ | NULL | PRIMARY KEY |

### 📄 Table: `property_detailed_location` (PropertyDetailedLocation Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `property_id` | `UUID` |  | ❌ | NULL | UNIQUE |
| `floor` | `INTEGER` |  | ❌ | NULL |  |
| `city` | `STRING(100)` |  | ❌ | NULL |  |
| `area` | `STRING(100)` |  | ❌ | NULL |  |
| `street_name` | `STRING(255)` |  | ❌ | NULL |  |
| `building_number` | `STRING(50)` |  | ❌ | NULL |  |
| `unit_apt` | `STRING(50)` |  | ❌ | NULL |  |
| `location_lat` | `FLOAT` |  | ❌ | NULL |  |
| `location_long` | `FLOAT` |  | ❌ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `property_house_rules` (PropertyHouseRule Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `property_id` | `UUID` | ✅ | ❌ | NULL | PRIMARY KEY |
| `house_rule_id` | `UUID` | ✅ | ❌ | NULL | PRIMARY KEY |

### 📄 Table: `property_images` (PropertyImage Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `image_url` | `TEXT(long)` |  | ❌ | NULL |  |
| `is_main` | `BOOLEAN` |  | ❌ | `false` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `property_ownership_docs` (PropertyOwnershipDoc Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `document_url` | `TEXT(long)` |  | ❌ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `property_reports` (PropertyReport Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `reporter_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `reason` | `ENUM(...Object.values(PropertyReportReason))` |  | ❌ | NULL |  |
| `details` | `TEXT` |  | ❌ | NULL |  |
| `snapshot_property_title` | `STRING(255)` |  | ✅ | NULL |  |
| `snapshot_property_address` | `TEXT` |  | ✅ | NULL |  |
| `snapshot_property_monthly_price` | `DECIMAL(10, 2)` |  | ✅ | NULL |  |
| `snapshot_property_thumbnail_url` | `TEXT` |  | ✅ | NULL |  |
| `snapshot_landlord_name` | `STRING(255)` |  | ✅ | NULL |  |
| `snapshot_landlord_email` | `STRING(255)` |  | ✅ | NULL |  |
| `status` | `ENUM(...Object.values(PropertyReportStatus))` |  | ❌ | `PropertyReportStatus.OPEN` |  |
| `reviewed_by_admin_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `reviewed_at` | `DATE` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `property_specifications` (PropertySpecifications Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `property_id` | `UUID` |  | ❌ | NULL | UNIQUE |
| `bedrooms` | `INTEGER` |  | ❌ | NULL |  |
| `bathrooms` | `INTEGER` |  | ❌ | NULL |  |
| `area_sqft` | `DECIMAL(10, 2)` |  | ❌ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `rental_requests` (RentalRequest Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `move_in_date` | `DATEONLY` |  | ❌ | NULL |  |
| `duration` | `ENUM(...RentalRequestDurationValues)` |  | ❌ | NULL |  |
| `occupants` | `INTEGER` |  | ❌ | NULL |  |
| `living_situation` | `ENUM(...Object.values(LivingSituation))` |  | ❌ | NULL |  |
| `message` | `TEXT` |  | ✅ | NULL |  |
| `status` | `ENUM(...Object.values(RentalRequestStatus))` |  | ❌ | `RentalRequestStatus.PENDING` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `roommate_matches` (RoommateMatch Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `request_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `matched_request_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `requester_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `matched_user_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `compatibility_score` | `INTEGER` |  | ❌ | NULL |  |
| `ai_explanation` | `TEXT` |  | ✅ | NULL |  |
| `source` | `ENUM(...Object.values(MatchSource))` |  | ❌ | `MatchSource.SMART` |  |
| `status` | `ENUM(...Object.values(MatchStatus))` |  | ❌ | `MatchStatus.PENDING` |  |
| `requester_action` | `ENUM(...Object.values(UserMatchAction))` |  | ❌ | `UserMatchAction.NONE` |  |
| `matched_user_action` | `ENUM(...Object.values(UserMatchAction))` |  | ❌ | `UserMatchAction.NONE` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `roommate_requests` (RoommateRequest Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `type` | `ENUM(...Object.values(RoommateRequestType))` |  | ❌ | NULL |  |
| `status` | `ENUM(...Object.values(RoommateRequestStatus))` |  | ❌ | `RoommateRequestStatus.ACTIVE` |  |
| `contract_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `preferred_city` | `STRING(100)` |  | ✅ | NULL |  |
| `preferred_area` | `STRING(100)` |  | ✅ | NULL |  |
| `budget_min` | `DECIMAL(10, 2)` |  | ✅ | NULL |  |
| `budget_max` | `DECIMAL(10, 2)` |  | ✅ | NULL |  |
| `preferred_gender` | `ENUM(...Object.values(PreferredGender))` |  | ✅ | NULL |  |
| `preferred_move_in_date` | `DATEONLY` |  | ✅ | NULL |  |
| `additional_note` | `TEXT` |  | ✅ | NULL |  |
| `max_occupants` | `INTEGER` |  | ✅ | NULL |  |
| `rooms_config` | `JSONB` |  | ✅ | NULL |  |
| `expires_at` | `DATE` |  | ❌ | `() => {` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `saved_properties` (SavedProperty Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `tenant_reports` (TenantReport Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `contract_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `reporter_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `reason` | `ENUM(...Object.values(TenantReportReason))` |  | ❌ | NULL |  |
| `details` | `TEXT` |  | ❌ | NULL |  |
| `status` | `ENUM(...Object.values(TenantReportStatus))` |  | ❌ | `TenantReportStatus.OPEN` |  |

### 📄 Table: `users` (User Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `email` | `STRING(255)` |  | ❌ | NULL | UNIQUE |
| `password_hash` | `STRING(255)` |  | ❌ | NULL |  |
| `role` | `ENUM(...Object.values(UserRole))` |  | ❌ | NULL |  |
| `is_verified` | `BOOLEAN` |  | ❌ | `false` |  |
| `reset_token_hash` | `STRING(255)` |  | ✅ | NULL |  |
| `reset_token_expires` | `DATE` |  | ✅ | NULL |  |
| `email_verified` | `BOOLEAN` |  | ❌ | `false` |  |
| `email_verification_token_hash` | `STRING(255)` |  | ✅ | NULL |  |
| `email_verification_token_expires` | `DATE` |  | ✅ | NULL |  |
| `is_banned` | `BOOLEAN` |  | ❌ | `false` |  |
| `ban_reason` | `TEXT` |  | ✅ | NULL |  |
| `ban_message` | `TEXT` |  | ✅ | NULL |  |
| `ban_until` | `DATE` |  | ✅ | NULL |  |
| `banned_by_admin_id` | `UUID` |  | ✅ | NULL | FOREIGN KEY |
| `ban_created_at` | `DATE` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `deleted_at` | `DATE` |  | ✅ | NULL |  |

### 📄 Table: `user_habits` (UserHabit Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `user_id` | `UUID` | ✅ | ❌ | NULL | PRIMARY KEY |
| `habit_id` | `UUID` | ✅ | ❌ | NULL | PRIMARY KEY |

### 📄 Table: `user_passkeys` (UserPasskey Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `credential_id` | `STRING(512)` |  | ❌ | NULL | UNIQUE |
| `public_key` | `TEXT` |  | ❌ | NULL |  |
| `counter` | `BIGINT` |  | ❌ | `0` |  |
| `transports` | `JSONB` |  | ✅ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `visit_bookings` (VisitBooking Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `property_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `tenant_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `visit_date` | `DATE` |  | ❌ | NULL |  |
| `status` | `ENUM(...Object.values(VisitBookingStatus))` |  | ❌ | `VisitBookingStatus.PENDING` |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |
| `updated_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

### 📄 Table: `webauthn_challenges` (WebAuthnChallenge Model)

| Column | Sequelize Type | PK | Nullable | Default | Unique / Key |
|---|---|:---:|:---:|---|---|
| `id` | `UUID` | ✅ | ✅ | `DataTypes.UUIDV4` | PRIMARY KEY |
| `user_id` | `UUID` |  | ❌ | NULL | FOREIGN KEY |
| `challenge` | `TEXT` |  | ❌ | NULL |  |
| `kind` | `STRING(32)` |  | ❌ | NULL |  |
| `expires_at` | `DATE` |  | ❌ | NULL |  |
| `created_at` | `DATE` |  | ✅ | `DataTypes.NOW` |  |

---

## 🔗 Entity Relationships & Constraints

Here is the detailed mapping of relationships, cascades, and composite keys:

### 1. User & Profiles (Auth Module)
- **User (users) ↔ Profile (profiles):** One-to-One. Linked by `profiles.user_id` -> `users.id` with `onDelete: 'CASCADE'`. Profiles hold wallet balances and identity details.
- **User (users) ↔ Habits (habits):** Many-to-Many via `user_habits`. Maps lifestyle attributes (sleep, noise, clean, etc.) for roommate matching.
- **User (users) ↔ Passkeys (user_passkeys):** One-to-Many. WebAuthn credentials used for secure passkey logins.
- **User (users) ↔ WebAuthnChallenges (webauthn_challenges):** One-to-Many. Challenges generated during WebAuthn login/registration flows.

### 2. Properties & Listings
- **User (users) ↔ Property (properties):** One-to-Many. A landlord (`landlord_id`) owns multiple properties.
- **Property (properties) ↔ Specifications (property_specifications):** One-to-One. Details room count, square footage, bathrooms.
- **Property (properties) ↔ Detailed Location (property_detailed_locations):** One-to-One. Exact longitude, latitude, floor, building details.
- **Property (properties) ↔ PropertyImage (property_images):** One-to-Many. Image URLs for property listing with an `is_main` flag.
- **Property (properties) ↔ PropertyOwnershipDoc (property_ownership_docs):** One-to-Many. Deed and proof-of-ownership URLs.
- **Property (properties) ↔ Amenity (amenities):** Many-to-Many via `property_amenities` join table.
- **Property (properties) ↔ HouseRule (house_rules):** Many-to-Many via `property_house_rules` join table.
- **Property (properties) ↔ PropertyReport (property_reports):** One-to-Many. Tenant complaints against listing details. Admin resolves.
- **Property (properties) ↔ VisitBooking (visit_bookings):** One-to-Many. Physical or video showing requests from tenants.

### 3. Rental Lifecycle (Requests, Contracts & Exits)
- **User (users) ↔ RentalRequest (rental_requests):** One-to-Many. Tenant submits applications to properties.
- **Property (properties) ↔ RentalRequest (rental_requests):** One-to-Many. Multiple tenants can apply to the same property.
- **RentalRequest (rental_requests) ↔ Contract (contracts):** One-to-One. When a request is approved, a lease contract is initialized.
- **Contract (contracts) ↔ User (users):** One-to-Many relationships for `landlord_id` and `tenant_id` respectively.
- **Contract (contracts) ↔ ContractMaintenanceResponsibility (contract_maintenance_responsibilities):** One-to-Many. Holds who pays for which repairs (Landlord vs. Tenant) for specific maintenance categories.
- **Contract (contracts) ↔ LeaseTerminationRequest (lease_termination_requests):** One-to-Many. Early exit requests submitted by users and reviewed by admins.
- **Contract (contracts) ↔ TenantReport (tenant_reports):** One-to-Many. Complaints filed by landlords against tenants for tenancy violations.

### 4. Maintenance Marketplace
- **MaintenanceRequest (maintenance_requests):** The central hub of maintenance. Relates to:
  - **Tenant (`tenant_id`)** who raised the issue.
  - **Landlord (`landlord_id`)** who owns the property.
  - **Property (`property_id`)** where the issue is.
  - **Contract (`contract_id`)** governing the lease.
  - **Assigned Provider (`assigned_provider_id`)** who performs the repair.
- **MaintenanceRequest ↔ MaintenanceJobApplication (maintenance_job_applications):** One-to-Many. Providers bid on the job request.
- **MaintenanceRequest ↔ MaintenanceLocation (maintenance_locations):** One-to-One. GPS location tracking of the provider en route.
- **MaintenanceRequest ↔ MaintenanceConflict (maintenance_conflicts):** One-to-One. Holds escrow dispute resolution states.
- **MaintenanceRequest ↔ MaintenanceRating (maintenance_ratings):** One-to-One. Review left by tenant after job completion.
- **MaintenanceRequest ↔ LandlordMaintenanceCharge (landlord_maintenance_charges):** One-to-Many. Repairs paid by landlord (deducted from next rent installment).

### 5. Chat, Notifications & Audit Logs
- **Conversation (conversations):** Relates `participant_one_id`, `participant_two_id`, and `property_id` (optional context).
- **Conversation ↔ Message (messages):** One-to-Many. Individual messages sent by `sender_id` in a chat room.
- **User (users) ↔ Notification (notifications):** One-to-Many. User notifications.
- **User (users) ↔ PaymentMethod (payment_methods):** One-to-Many. Customer payment tokens.
- **User (users) ↔ ActivityLog (activity_logs):** One-to-Many. System audit logs tracked by `actor_user_id`.

### 6. Roommate Matching
- **User (users) ↔ RoommateRequest (roommate_requests):** One-to-Many. Search for flat vs. search for roommate.
- **Contract (contracts) ↔ RoommateRequest (roommate_requests):** One-to-Many. Associates a roommate search with an active lease.
- **RoommateRequest ↔ RoommateMatch (roommate_matches):** One-to-Many. Associates compatibility scores and match actions between roommate requests (`request_id` and `matched_request_id`).
- **User (users) ↔ RoommateMatch (roommate_matches):** One-to-Many. Maps connection invites between `requester_id` and `matched_user_id`.

---

### 🔑 Composite Keys & Database Indexes
- **Composite Index (`user_habits`):** Unique constraint on `user_id` + `habit_id`.
- **Composite Index (`property_amenities`):** Unique constraint on `property_id` + `amenity_id`.
- **Composite Index (`property_house_rules`):** Unique constraint on `property_id` + `house_rule_id`.
- **Composite Index (`saved_properties`):** Unique constraint on `user_id` + `property_id`.
- **Index on `users`:** Unique index on `email`.
- **Index on `conversations`:** Unique index on `participant_one_id` + `participant_two_id` + `property_id`.

*Generated automatically from Sequelize models - June 2026*