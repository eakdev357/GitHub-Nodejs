
const express = require('express');
const sql = require('mssql');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// การตั้งค่าฐานข้อมูล
const dbConfig = {
    server: process.env.DB_SERVER || '192.168.77.26',
    database: process.env.DB_NAME || 'qrcode',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'password@1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
    }
};

// Mock Data
const mockContracts = [
    {
        Contract_ID: 1,
        Contract_Number: 'CT-2025-001',
        Customer_ID: 1001,
        Created_Date: new Date('2025-01-15'),
        Created_User: 'admin',
        package_count: 3,
        total_target: 15000
    },
    {
        Contract_ID: 2,
        Contract_Number: 'CT-2025-002',
        Customer_ID: 1002,
        Created_Date: new Date('2025-02-01'),
        Created_User: 'manager',
        package_count: 2,
        total_target: 8000
    }
];

const mockOrders = [
    {
        id: 1,
        order_code: 'PO-001',
        customer_id: 1001,
        shift_id: 'A',
        status: 1,
        target_quantity: 5000,
        actual_quantity: 0,
        created_at: new Date('2025-06-05'),
        status_text: 'รอดำเนินการ',
        shift_text: 'กะ A (06:00-14:00)'
    },
    {
        id: 2,
        order_code: 'PO-002',
        customer_id: 1002,
        shift_id: 'B',
        status: 2,
        target_quantity: 3000,
        actual_quantity: 1500,
        created_at: new Date('2025-06-06'),
        status_text: 'กำลังผลิต',
        shift_text: 'กะ B (14:00-22:00)'
    }
];

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// เชื่อมต่อฐานข้อมูล
let dbConnected = false;
let dbError = null;

async function initDatabase() {
    try {
        await sql.connect(dbConfig);
        console.log('✅ เชื่อมต่อ SQL Server สำเร็จ');
        dbConnected = true;
        dbError = null;
    } catch (err) {
        console.error('❌ เชื่อมต่อฐานข้อมูลไม่สำเร็จ:', err.message);
        console.log('🔄 ใช้ Mock Data แทน');
        dbConnected = false;
        dbError = `ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ${err.message}`;
    }
}

// เริ่มต้นการเชื่อมต่อ
initDatabase();

function getOrderStats(orders) {
    const stats = { pending: 0, active: 0, completed: 0, cancelled: 0 };
    orders.forEach(order => {
        switch(order.status) {
            case 1: stats.pending++; break;
            case 2: stats.active++; break;
            case 3: stats.completed++; break;
            case 4: stats.cancelled++; break;
        }
    });
    return stats;
}

// ===================== Web Routes =====================

// หน้าแรก - Dashboard
app.get('/', (req, res) => {
    const orderStats = getOrderStats(mockOrders);
    
    res.render('dashboard', { 
        title: 'ระบบจัดการคิวการผลิต',
        contracts: mockContracts,
        orderStats: orderStats,
        dbError: dbError,
        dbConnected: dbConnected
    });
});

// หน้าจัดการ Contract
app.get('/contracts', (req, res) => {
    res.render('contracts', { 
        title: 'จัดการสัญญา',
        contracts: mockContracts,
        error: dbError
    });
});

// หน้าสร้าง Contract ใหม่
app.get('/contracts/new', (req, res) => {
    res.render('contract_form', { 
        title: 'สร้างสัญญาใหม่',
        contract: null,
        error: dbError
    });
});

// บันทึก Contract ใหม่
app.post('/contracts', (req, res) => {
    const { contract_number, customer_id, created_user } = req.body;
    
    // เพิ่มใน mock data
    const newContract = {
        Contract_ID: mockContracts.length + 1,
        Contract_Number: contract_number,
        Customer_ID: parseInt(customer_id),
        Created_Date: new Date(),
        Created_User: created_user,
        package_count: 0,
        total_target: 0
    };
    mockContracts.unshift(newContract);
    
    res.redirect('/contracts');
});

// หน้าคิวการผลิต
app.get('/production-queue', (req, res) => {
    res.render('production_queue', {
        title: 'คิวการผลิต',
        orders: mockOrders,
        error: dbError
    });
});

// หน้าสร้างคิวการผลิตใหม่
app.get('/production-queue/new', (req, res) => {
    res.render('production_order_form', {
        title: 'สร้างคิวการผลิต',
        order: null,
        error: dbError
    });
});

// บันทึกคิวการผลิตใหม่
app.post('/production-queue', (req, res) => {
    const { order_code, customer_id, shift_id, target_quantity } = req.body;
    
    const shiftText = {
        'A': 'กะ A (06:00-14:00)',
        'B': 'กะ B (14:00-22:00)',
        'C': 'กะ C (22:00-06:00)'
    };
    
    const newOrder = {
        id: mockOrders.length + 1,
        order_code: order_code,
        customer_id: parseInt(customer_id),
        shift_id: shift_id,
        status: 1,
        target_quantity: parseInt(target_quantity),
        actual_quantity: 0,
        created_at: new Date(),
        status_text: 'รอดำเนินการ',
        shift_text: shiftText[shift_id] || shift_id
    };
    mockOrders.unshift(newOrder);
    
    res.redirect('/production-queue');
});

// อัปเดตสถานะคิวการผลิต
app.post('/production-queue/:id/status', (req, res) => {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    const order = mockOrders.find(o => o.id === orderId);
    if (order) {
        order.status = parseInt(status);
        const statusTexts = {
            1: 'รอดำเนินการ',
            2: 'กำลังผลิต',
            3: 'เสร็จสิ้น',
            4: 'ยกเลิก'
        };
        order.status_text = statusTexts[status] || 'ไม่ระบุ';
    }
    
    res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ' });
});

// API endpoint สำหรับทดสอบการเชื่อมต่อ
app.get('/api/test-connection', (req, res) => {
    res.json({ 
        success: !dbError, 
        connected: dbConnected, 
        error: dbError,
        server: dbConfig.server,
        database: dbConfig.database
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).render('error', { error: 'ไม่พบหน้าที่ต้องการ' });
});

// เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT}`);
    console.log(`🌐 เปิดเว็บไซต์ที่ http://localhost:${PORT}`);
    console.log(`🔗 ทดสอบการเชื่อมต่อ: http://localhost:${PORT}/api/test-connection`);
    
    if (!dbConnected) {
        console.log(`⚠️  ใช้ Mock Data เนื่องจากเชื่อมต่อฐานข้อมูลไม่ได้`);
    }
});