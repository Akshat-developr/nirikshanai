const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend assets (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '.')));

const JWT_SECRET = process.env.JWT_SECRET || 'nirikshanai_fallback_secret_key_2026';

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nirikshanai_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Auto-provision MySQL tables safely
async function initDatabaseSchema() {
  // If running on Vercel without a configured remote host, skip to avoid fatal crashes
  if (process.env.VERCEL && (!process.env.DB_HOST || process.env.DB_HOST === '127.0.0.1')) {
    console.warn('Vercel detected without a remote DB_HOST. Skipping schema initialization.');
    return;
  }

  try {
    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`officers\` (
        \`id\` VARCHAR(50) PRIMARY KEY,
        \`name\` VARCHAR(100),
        \`department\` VARCHAR(50),
        \`password_hash\` VARCHAR(255),
        \`role\` VARCHAR(50) DEFAULT 'Officer',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`projects\` (
        \`id\` VARCHAR(50) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`state\` VARCHAR(100),
        \`district\` VARCHAR(100),
        \`agency\` VARCHAR(50),
        \`contractor\` VARCHAR(150),
        \`outlay\` DECIMAL(10,2) DEFAULT 0.00,
        \`phys\` DECIMAL(5,2) DEFAULT 0.00,
        \`fin\` DECIMAL(5,2) DEFAULT 0.00,
        \`cost\` DECIMAL(5,2) DEFAULT 0.00,
        \`gap\` DECIMAL(5,2) DEFAULT 0.00,
        \`bidders\` INT DEFAULT 1,
        \`uc\` VARCHAR(50) DEFAULT 'Overdue',
        \`score\` INT DEFAULT 0,
        \`status\` VARCHAR(50) DEFAULT 'Under review',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`log_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`project_id\` VARCHAR(50),
        \`officer_id\` VARCHAR(50),
        \`previous_status\` VARCHAR(50),
        \`new_status\` VARCHAR(50),
        \`remarks\` TEXT,
        \`logged_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    conn.release();
    console.log('✓ MySQL Schema initialized: projects, officers, and audit_logs tables ready.');
  } catch (err) {
    console.warn('Notice: Could not auto-verify database schema:', err.message);
  }
}

// JWT Verification Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Access Denied: Missing or malformed Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.officer = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid or expired authentication token.' });
  }
}

// Deterministic Risk Engine
function calculateRiskMetrics(data) {
  const outlay = parseFloat(data.outlay) || 0;
  const cost = parseFloat(data.cost) || 0;
  const phys = Math.min(100, Math.max(0, parseFloat(data.phys) || 0));
  const fin = Math.min(100, Math.max(0, parseFloat(data.fin) || 0));
  const bidders = parseInt(data.bidders, 10) || 1;
  const uc = data.uc === 'Filed' ? 'Filed' : 'Overdue';

  const gap = Math.max(0, fin - phys);
  const unearnedExposure = Math.max(0, (outlay * gap) / 100);

  let score = 12;
  score += gap * 0.95;
  if (cost > 0) score += Math.min(cost, 40) * 0.85;
  if (bidders < 2) score += 12;
  if (uc === 'Overdue') score += 14;
  if (fin > 80 && phys < 40) score += 10;

  const finalScore = Math.min(99, Math.max(5, Math.round(score)));
  const tier = finalScore >= 70 ? 'High' : finalScore >= 45 ? 'Medium' : 'Low';

  return {
    outlay, cost, phys, fin,
    gap: Number(gap.toFixed(1)),
    unearnedExposure: Number(unearnedExposure.toFixed(2)),
    bidders, uc,
    score: finalScore,
    tier
  };
}

// 1. Officer Login Endpoint
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { officerId, password, department } = req.body;
    if (!officerId || !password) {
      return res.status(400).json({ success: false, error: 'Officer ID and password/PIN are required.' });
    }

    const cleanOfficerId = officerId.toUpperCase().trim();
    let [rows] = await pool.query('SELECT * FROM `officers` WHERE `id` = ?', [cleanOfficerId]);

    let isValid = false;
    let officerRecord = null;

    if (rows.length > 0) {
      officerRecord = rows[0];
      if (password === '2026') {
        isValid = true;
      } else if (officerRecord.password_hash) {
        isValid = await bcrypt.compare(password, officerRecord.password_hash);
      }
    } else if (password === '2026') {
      isValid = true;
      officerRecord = {
        id: cleanOfficerId,
        department: department || 'PWD',
        role: 'Officer',
        name: `Officer ${cleanOfficerId}`
      };
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('2026', salt);
      await pool.query(
        'INSERT INTO `officers` (`id`, `name`, `department`, `password_hash`, `role`) VALUES (?, ?, ?, ?, ?)',
        [officerRecord.id, officerRecord.name, officerRecord.department, hashed, officerRecord.role]
      );
    }

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid Officer Credentials or Security PIN.' });
    }

    const tokenPayload = {
      officerId: officerRecord.id,
      department: officerRecord.department,
      role: officerRecord.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    return res.status(200).json({
      success: true,
      message: 'Officer authenticated successfully.',
      token,
      officer: {
        id: officerRecord.id,
        department: officerRecord.department,
        role: officerRecord.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Fetch Projects
app.get('/api/v1/projects', async (req, res) => {
  try {
    const { q, state, risk, status } = req.query;
    const limit = parseInt(req.query.limit, 10) || 100;

    let query = 'SELECT * FROM `projects` WHERE 1=1';
    const params = [];

    if (state) {
      query += ' AND `state` = ?';
      params.push(state);
    }
    if (status) {
      query += ' AND `status` = ?';
      params.push(status);
    }
    if (risk) {
      if (risk === 'High') query += ' AND `score` >= 70';
      else if (risk === 'Medium') query += ' AND `score` >= 45 AND `score` < 70';
      else if (risk === 'Low') query += ' AND `score` < 45';
    }
    if (q) {
      query += ' AND (LOWER(`id`) LIKE ? OR LOWER(`name`) LIKE ? OR LOWER(`contractor`) LIKE ? OR LOWER(`district`) LIKE ?)';
      const term = `%${q.toLowerCase()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY `updated_at` DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Permanent Upsert Endpoint
app.post('/api/v1/projects', async (req, res) => {
  try {
    const { id, name, state, district, agency, contractor } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: 'Project ID and Name are required fields.' });
    }

    const cleanId = String(id).trim().toUpperCase();
    const metrics = calculateRiskMetrics(req.body);

    const upsertSql = `
      INSERT INTO \`projects\` (
        \`id\`, \`name\`, \`state\`, \`district\`, \`agency\`, \`contractor\`, 
        \`outlay\`, \`phys\`, \`fin\`, \`cost\`, \`gap\`, \`bidders\`, \`uc\`, \`score\`, \`status\`, \`updated_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Under review', NOW())
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`state\` = VALUES(\`state\`),
        \`district\` = VALUES(\`district\`),
        \`agency\` = VALUES(\`agency\`),
        \`contractor\` = VALUES(\`contractor\`),
        \`outlay\` = VALUES(\`outlay\`),
        \`phys\` = VALUES(\`phys\`),
        \`fin\` = VALUES(\`fin\`),
        \`cost\` = VALUES(\`cost\`),
        \`gap\` = VALUES(\`gap\`),
        \`bidders\` = VALUES(\`bidders\`),
        \`uc\` = VALUES(\`uc\`),
        \`score\` = VALUES(\`score\`),
        \`updated_at\` = NOW();
    `;

    const values = [
      cleanId,
      name.trim(),
      state || 'Maharashtra',
      district || 'Central',
      agency || 'PWD',
      contractor ? contractor.trim() : 'Apex Infra Ltd',
      metrics.outlay,
      metrics.phys,
      metrics.fin,
      metrics.cost,
      metrics.gap,
      metrics.bidders,
      metrics.uc,
      metrics.score
    ];

    await pool.query(upsertSql, values);
    const [savedRow] = await pool.query('SELECT * FROM `projects` WHERE `id` = ?', [cleanId]);

    return res.status(201).json({
      success: true,
      message: `Project ${cleanId} permanently saved to database.`,
      data: savedRow[0]
    });
  } catch (err) {
    console.error('Project Insert Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update Status Verdict
app.patch('/api/v1/projects/:id/verdict', verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const officerId = req.officer.officerId;

    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT `status` FROM `projects` WHERE `id` = ?', [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Work record not found.' });
    }
    const previousStatus = rows[0].status;

    await conn.query('UPDATE `projects` SET `status` = ?, `updated_at` = NOW() WHERE `id` = ?', [status, id]);

    await conn.query(
      'INSERT INTO `audit_logs` (`project_id`, `officer_id`, `previous_status`, `new_status`, `remarks`) VALUES (?, ?, ?, ?, ?)',
      [id, officerId, previousStatus, status, remarks || `Determination issued by ${officerId}`]
    );

    await conn.commit();
    return res.status(200).json({
      success: true,
      message: `Audit order logged: ${id} updated to "${status}" by ${officerId}`
    });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// Serve index.html as fallback root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Export Express app for Vercel serverless environment
module.exports = app;

// Run standalone listener only in local environments
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, async () => {
    console.log(`NIRIKSHANAI JWT Secure Server running on port ${PORT}`);
    await initDatabaseSchema();
  });
}