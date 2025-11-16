const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();
const app = express();
const http = require('http');
const server = http.createServer(app);
app.use(cors());

const io = require("socket.io")(server, {
  cors: { origin: "*" }
});
const db = mysql.createPool({
    uri: process.env.DB_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get('/', (req, res) => {
    res.json('Hello this is the backend');
});
app.post('/login', express.json(), (req, res) => {
    const data = req.body;
    const q = 'SELECT name, designation FROM employee WHERE employee_id = ? AND password = ? AND status = ?';
    const values = [data.employee_id, data.password, 'Working'];
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
            return res.json({error: err});
        }
        return res.json(rows);
    });
});
app.post('/staff/update' , express.json() , (req,res) => {
    const data = req.body;
    const q = 'UPDATE employee SET name = ? , designation = ? , password = ? , Daily_wage = ? , status = ? WHERE employee_id = ?';
    const values = [data.name , data.designation , data.password , data.daily_wage , data.status , data.employee_id];
    db.query(q, values , (err,result) => {
        if(err) {
          console.log('Error updating the employee data :' ,err);
          return res.send(err);
        }
        io.emit("statusChanged:" + data.employee_id, data.status);
        return res.send("Employee updated succesfully");
    });
});
app.get('/suppliers', (req, res) => {
    const q = 'SELECT * FROM supplier'; 
    db.query(q, (err, rows) => {
        if (err) {
            return res.json({error: err});
        }
        return res.json(rows);
    });
});
app.get('/deliveries', (req,res) => {
    const q = 'SELECT * FROM delivery ORDER BY product_id DESC';
    db.query(q, (err,rows) => {
        if (err) {
            return res.json({error: err});
        }
        return res.json(rows);
    })
})
app.get('/stock', (req,res) => {
    const q = 'SELECT p.product_id,d.product_name,p.quantity_present,p.sp,p.discount_in_percent,p.expiry_date FROM products p JOIN delivery d ON p.product_id = d.product_id;';
    db.query(q, (err,rows) => {
        if (err) {
            return res.json({error : err});
        }
        return res.json(rows);
    })
})
app.get('/expired', (req,res) => {
    const q = 'SELECT * FROM expired';
    db.query(q, (err,rows) => {
        if (err) {
            return res.json({errpr : err});
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
  const phone_number = req.body.phone_number;

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
            ON DUPLICATE KEY UPDATE
                quantity_sold = quantity_sold + VALUES(quantity_sold),
                revenue = revenue + VALUES(revenue);
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
              res.status(500).json({ error: "Commit error", err });
            });
          }
          res.json({msg: "sales recorded succesfully"});
          io.emit("stockUpdated");
        });
      })
      .catch(err => {
        db.rollback(() => {
          res.status(500).json({ msg: "sales recording failed", err });
        });
      });
  });
});


app.post("/api/profits/summary", express.json() , (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);

    from = past30.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  const sql = `
    SELECT 
      SUM(s.revenue) AS total_revenue,
      SUM(s.quantity_sold * d.cp) AS total_cost,
      (SUM(s.revenue) - SUM(s.quantity_sold * d.cp)) AS total_profit
    FROM sales s
    JOIN delivery d ON s.product_id = d.product_id
    WHERE s.date BETWEEN ? AND ?
  `;
  db.query(sql,[from,to] ,(err, data) => {
    if (err) return res.status(500).json({error : err});
    res.json(data[0]);
  });
});

app.post("/api/loss/summary", express.json() , (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);

    from = past30.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  const sql = `
    SELECT 
      SUM(loss) AS total_loss
    FROM expired 
    WHERE date_expired BETWEEN ? AND ?
  `;
  db.query(sql,[from,to] ,(err, data) => {
    if (err) return res.status(500).json({error : err});
    res.json(data[0]);
  });
});

app.post("/api/profits/byCategory", express.json() , (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);

    from = past30.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  const sql = `
    SELECT 
      su.category,
      SUM(s.revenue) AS revenue,
      SUM(s.quantity_sold * d.cp) AS cost,
      (SUM(s.revenue) - SUM(s.quantity_sold * d.cp)) AS profit
    FROM sales s
    JOIN delivery d ON s.product_id = d.product_id
    JOIN supplier su ON d.supplier_id = su.supplier_id
    WHERE s.date BETWEEN ? AND ?
    GROUP BY su.category
  `;
  db.query(sql, [from , to] , (err, data) => {
    if (err) return res.status(500).json({error : err});
    res.json(data);
  });
});

app.post("/api/loss/byCategory", express.json() , (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);

    from = past30.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  const sql = `
    SELECT 
      su.category,
      SUM(e.loss) AS total_loss
    FROM expired e
    JOIN delivery d ON e.product_id = d.product_id
    JOIN supplier su ON d.supplier_id = su.supplier_id
    WHERE e.date_expired BETWEEN ? AND ?
    GROUP BY su.category
  `;
  db.query(sql, [from , to] , (err, data) => {
    if (err) return res.status(500).json({error : err});
    res.json(data);
  });
});

app.post("/api/profits/byProduct", express.json(), (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);

    from = past30.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  const sql = `
    SELECT 
      s.product_id,
      d.product_name,
      SUM(s.revenue) AS revenue,
      SUM(s.quantity_sold * d.cp) AS cost,
      (SUM(s.revenue) - SUM(s.quantity_sold * d.cp)) AS profit
    FROM sales s
    JOIN delivery d ON s.product_id = d.product_id
    WHERE s.date BETWEEN ? AND ?
    GROUP BY s.product_id, d.product_name
    ORDER BY profit DESC
  `;
  db.query(sql, [from,to] ,(err, data) => {
    if (err) return res.status(500).json({error : err});
    res.json(data);
  });
});

app.post("/api/loss/byProduct", express.json(), (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);

    from = past30.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  const sql = `
    SELECT 
      e.product_id,
      e.quantity_expired,
      d.product_name,
      SUM(e.loss) AS total_loss
    FROM expired e
    JOIN delivery d ON e.product_id = d.product_id
    WHERE e.date_expired BETWEEN ? AND ?
    GROUP BY e.product_id, d.product_name
    ORDER BY total_loss DESC
  `;
  db.query(sql, [from,to] ,(err, data) => {
    if (err) return res.status(500).json({error : err});
    res.json(data);
  });
});

app.post("/api/profits/byDateRange", express.json() , (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);

    from = past30.toISOString().split("T")[0];
    to = today.toISOString().split("T")[0];
  }

  const sql = `
    SELECT 
      s.date,
      SUM(s.revenue) AS revenue,
      SUM(s.quantity_sold * d.cp) AS cost,
      (SUM(s.revenue) - SUM(s.quantity_sold * d.cp)) AS profit
    FROM sales s
    JOIN delivery d ON s.product_id = d.product_id
    WHERE s.date BETWEEN ? AND ?
    GROUP BY s.date
    ORDER BY s.date ASC
  `;
  db.query(sql, [from, to], (err, data) => {
    if (err) return res.status(500).json({error : err});
    res.json(data);
  });
});


app.post('/report/monthly-stats', express.json(),  (req, res) => {
  const { year } = req.body;
  const query = `
    SELECT 
      month,
      COALESCE(SUM(sales_profit), 0) AS total_profit,
      COALESCE(SUM(expired_loss), 0) AS total_loss
    FROM (
      SELECT MONTH(s.date) as month, (SUM(s.revenue)-SUM(s.quantity_sold * d.cp)) AS sales_profit, 0 AS expired_loss
      FROM sales s
      JOIN delivery d ON s.product_id = d.product_id
      WHERE YEAR(s.date) = ?
      GROUP BY month
      UNION ALL
      SELECT MONTH(date_expired) as month, 0 AS sales_profit, SUM(loss) AS expired_loss
      FROM expired WHERE YEAR(date_expired) = ?
      GROUP BY month
    ) AS combined
    GROUP BY month
    ORDER BY month;
  `;
  db.query(query , [year,year] , (err,data)=>{
    if (err) return res.status(500).json({error : err});
    res.json(data);
  });
});

app.get('/report/yearly-stats', express.json() , (req, res) => {
  const query = `
    SELECT 
      year,
      COALESCE(SUM(sales_profit), 0) AS total_profit,
      COALESCE(SUM(expired_loss), 0) AS total_loss
    FROM (
      SELECT YEAR(s.date) as year, (SUM(s.revenue)-SUM(s.quantity_sold * d.cp)) AS sales_profit, 0 AS expired_loss
      FROM sales s
      JOIN delivery d ON s.product_id = d.product_id
      GROUP BY year
      UNION ALL
      SELECT YEAR(date_expired) as year, 0 AS sales_profit, SUM(loss) AS expired_loss
      FROM expired
      GROUP BY year
    ) AS combined
    GROUP BY year
    ORDER BY year;
  `;
  db.query(query , (err,data)=>{
    if (err) return res.status(500).json({error : err});
    res.json(data);
  });
});


server.listen(3000, () => {
  console.log('Server is - is running on port 3000');
});
