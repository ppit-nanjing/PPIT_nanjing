-- Add a general file-upload field type (documents, not just images).
ALTER TYPE "membership_field_type" ADD VALUE IF NOT EXISTS 'file';
