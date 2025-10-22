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
app.get('/stock', (req,res) => {
    const q = 'SELECT d.product_name,p.quantity_present,p.sp,p.discount_in_percent,p.expiry_date FROM products p JOIN delivery d ON p.product_id = d.product_id;';
    db.query(q, (err,rows) => {
        if (err) {
            console.log('Error fetching stock data:', err);
            return res.send(err);
        }
        return res.json(rows);
    })
})
app.get('/expired', (req,res) => {
    const q = 'SELECT * FROM expired';
    db.query(q, (err,rows) => {
        if (err) {
            console.log('Error fetching expiry data:', err);
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

    db.beginTransaction((err) => {
        if (err) {
            return res.send("Error: " + err);
        }

        const q = 'INSERT INTO delivery (supplier_id, employee_id, product_name, quantity, cp, expenses) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [data.supp, data.emp, data.name, data.quantity, data.cp, data.expenses];

        db.query(q, values, (err, result) => {
            if (err) {
                return db.rollback(() => {
                    res.send("Error occured for delivery entry: " + err);
                });
            }

            const q1 = 'INSERT INTO products ( quantity_present, sp, expiry_date) VALUES ( ?, ?, ?)';
            const values1 = [ data.quantity, data.sp, data.exp];

            db.query(q1, values1, (err, result1) => {
                if (err) {
                    return db.rollback(() => {
                        res.send("Error occured for stock entry: " + err);
                    });
                }

                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.send("commit error: " + err);
                        });
                    }
                    res.send("Delivery & Stock entry successful");
                });
            });
        });
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

app.post('/makebill', express.json(), (req, res) => {
  try {
    const items = req.body.items;
    const ids = items.map(item => item.product_id);

    const query = `
      SELECT p.product_id, d.product_name, p.sp, p.discount_in_percent
      FROM products AS p
      JOIN delivery AS d ON p.product_id = d.product_id
      WHERE p.product_id IN (?)`;

    db.query(query, [ids], (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "Database error", details: err });
      }

      const bill = items.map((item) => {
        const p = results.find(prod => prod.product_id == item.product_id);
        if (!p) return { product_id: item.product_id, product_name: "Not found" };

        const qty = parseInt(item.quantity);
        const discount = p.discount_in_percent || 0;
        const total = p.sp * qty;
        const final_price = total - (total * discount / 100);

        return {
          product_id: p.product_id,
          product_name: p.product_name,
          quantity: qty,
          price: p.sp,
          discount: discount,
          final_price: final_price
        };
      });

      res.json(bill);
    });
  } catch (e) {
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
});

app.post('/payment', express.json(), (req, res) => {

  const items = req.body.items;

  db.beginTransaction(err => {
    if (err) {
      return res.status(500).json({ msg: "Transaction start error", err });
    }

    const promises = items.map(item => {
      return new Promise((resolve, reject) => {
        const updateStock = `UPDATE products SET quantity_present = quantity_present - ? WHERE product_id = ?`;
        db.query(updateStock, [item.quantity, item.product_id], (err) => {
          if (err) return reject("Error updating stock: " + err);

          const insertSale = `
            INSERT INTO sales (product_id, quantity_sold, sold_price, revenue)
            VALUES (?, ?, ?, ?)
          `;
          const values = [item.product_id, item.quantity, item.price, item.final_price];
          db.query(insertSale, values, (err) => {
            if (err) return reject("Error inserting into sales: " + err);
            resolve();
          });
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ msg: "Commit error", err });
            });
          }
          res.json({ msg: "Sales recorded successfully" });
        });
      })
      .catch(err => {
        db.rollback(() => {
          res.status(500).json({ msg: "Transaction failed", err });
        });
      });
  });
});





app.listen(3000, () => {
  console.log('Server is - is running on port 3000');
});
