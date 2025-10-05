const express = require('express');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql2');
require('dotenv').config();
const app = express();
app.use(cors());


const db = mysql.createConnection(process.env.DB_URL);
db.connect((err) => {
    if (err) {
        console.log('Error connecting to MySQL database:', err);
        return;
    }  
    console.log('Connected to MySQL database.');
})

app.get('/', (req, res) => {
    res.json('Hello this is the backend');
});
app.post('/login', express.json(), (req, res) => {
    const data = req.body;
    const q = 'SELECT name, designation FROM employee WHERE employee_id = ? AND password = ? AND designation IN (?, ?, ?)';
    const values = [data.employee_id, data.password,'manager','cashier','admin'];
    db.query(q, values, (err, rows) => {
        if (err) {
            return res.json("Error occured: "+err);
        }
        if(rows.length === 0){
            return res.json({msg:"Invalid"});
        }
        return res.json({msg:"Valid", name:rows[0].name, designation:rows[0].designation});
    });
});
app.get('/staff', (req, res) => {
    const q = 'SELECT * FROM employee'; 
    db.query(q, (err, rows) => {
        if (err) {
            console.log('Error fetching employee data:', err);
            return res.send(err);
        }
        return res.json(rows);
    });
});
app.get('/suppliers', (req, res) => {
    const q = 'SELECT * FROM supplier'; 
    db.query(q, (err, rows) => {
        if (err) {
            console.log('Error fetching employee data:', err);
            return res.send(err);
        }
        return res.json(rows);
    });
});
app.get('/deliveries', (req,res) => {
    const q = 'SELECT * FROM delivery ORDER BY product_id DESC';
    db.query(q, (err,rows) => {
        if (err) {
            console.log('Error fetching delivery data:', err);
            return res.send(err);
        }
        return res.json(rows);
    })
})
app.post('/staff/addemployee', express.json(), (req, res) => {
    const data = req.body;
    const q = 'INSERT INTO employee (employee_id, name, designation, Daily_wage, password) VALUES (?, ?, ?, ?, ?)';
    const values = [data.employee_id, data.name, data.designation, data.Daily_wage, data.password];
    db.query(q, values, (err, result,fields) => {
        if (err){
            return res.send("Error occured: "+err);
        }
        return res.send("Employee added successfully");
    });
});
app.post('/suppliers/Add', express.json(), (req, res) => {
    const data = req.body;
    const q = 'INSERT INTO supplier (supplier_id, s_name, category, contact_no) VALUES (?, ?, ?, ?)';
    const values = [data.id, data.name, data.cat, data.cont];
    db.query(q, values, (err, result) => {
        if (err){
            return res.send("Error occured: "+err);
        }
        return res.send("Supplier added successfully");
    });
});
app.post('/deliveries/Add', express.json(), (req, res) => {
    const data = req.body;
    const q = 'INSERT INTO delivery (supplier_id,employee_id,product_name,quantity,cp,expenses) VALUES (?, ?, ?, ?, ?, ?)';
    const q1 = 'INSERT INTO products (quantity_present,sp,expiry_date) VALUES (? ,? ,?)';
    const values = [data.supp,data.emp,data.name,data.quantity,data.cp,data.expenses];
    const values1 = [data.quantity,data.sp,data.exp];
    db.query(q, values, (err, result) => {
        if (err){
            return res.send("Error occured for entry: "+err);
        }
        res.send("Delivery Entry Successful");
        db.query(q1, values1 , (err,result1)=>{
            if(err){
                return res.send("Error occured for stock entry:"+ err);
            }
            res.send("stock entry successful");
        })
    });

});
app.post('/staff/deleteemployee', express.json(), (req, res) => {
    const data = req.body;
    const q = 'DELETE FROM employee WHERE employee_id = ?';
    const values = [data.employee_id];
    db.query(q, values, (err, result,fields) => {
        if (err){
            return res.send("Error occured: "+err);
        }
        if(result.affectedRows === 0){
            return res.send("No employee found with the given Employee_ID");
        }
        return res.send("Employee deleted successfully");
    });
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
