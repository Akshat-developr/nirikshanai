CREATE DATABASE IF NOT EXISTS `nirikshanai_db`;
USE `nirikshanai_db`;

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS `projects` (
    `id` VARCHAR(32) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `agency` VARCHAR(150) NOT NULL,
    `contractor` VARCHAR(150) NOT NULL,
    `outlay` DECIMAL(12, 2) NOT NULL,
    `phys` DECIMAL(5, 2) DEFAULT 0.00,
    `fin` DECIMAL(5, 2) DEFAULT 0.00,
    `cost` DECIMAL(5, 2) DEFAULT 0.00,
    `gap` DECIMAL(5, 2) DEFAULT 0.00,
    `bidders` INT DEFAULT 1,
    `uc` ENUM('Filed', 'Overdue') DEFAULT 'Overdue',
    `score` INT DEFAULT 0,
    `status` ENUM('Under review', 'Confirmed', 'Dismissed', 'Escalated', 'Resolved') DEFAULT 'Under review',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Audit Trail Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT AUTO_INCREMENT NOT NULL,
    `project_id` VARCHAR(32) NOT NULL,
    `officer_id` VARCHAR(64) DEFAULT 'OFFICER-SESSION',
    `previous_status` VARCHAR(50) DEFAULT NULL,
    `new_status` VARCHAR(50) DEFAULT NULL,
    `remarks` TEXT,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_project_audit` FOREIGN KEY (`project_id`) 
        REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify All Monitored Projects

SELECT 
    id AS work_code,
    name AS project_name,
    state,
    district,
    agency,
    contractor,
    outlay AS sanctioned_outlay_cr,
    phys AS physical_progress_pct,
    fin AS disbursed_pct,
    gap AS disbursement_gap,
    score AS risk_score,
    status AS case_status,
    updated_at
FROM nirikshanai_db.projects
ORDER BY updated_at DESC;

--Filter High-Risk Works Requiring Review

--SQL
SELECT 
    id,
    name,
    state,
    outlay,
    phys,
    fin,
    gap,
    score,
    uc AS utilisation_certificate
FROM nirikshanai_db.projects
WHERE score >= 70
ORDER BY score DESC;
--Inspect Registered Officers

SELECT 
    id AS officer_id,
    name,
    department,
    role,
    created_at
FROM nirikshanai_db.officers
ORDER BY created_at DESC;
--View Audit Log Entries with Officer and Project Details

SQL
SELECT 
    a.log_id,
    a.project_id,
    p.name AS project_name,
    a.officer_id,
    o.department AS officer_department,
    a.previous_status,
    a.new_status,
    a.remarks,
    a.logged_at
FROM nirikshanai_db.audit_logs a
LEFT JOIN nirikshanai_db.projects p ON a.project_id = p.id
LEFT JOIN nirikshanai_db.officers o ON a.officer_id = o.id
ORDER BY a.logged_at DESC;
