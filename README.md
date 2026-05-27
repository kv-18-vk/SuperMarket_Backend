# Supermarket Backend

This is the backend server for the Supermarket management system. It provides a RESTful API and real-time Socket.io communication to manage various aspects of a supermarket, including staff, suppliers, inventory, billing, and sales analytics.

## Tech Stack

- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/)
- **Database:** [MySQL](https://www.mysql.com/) (using `mysql2` connection pool)
- **Real-time Communication:** [Socket.io](https://socket.io/)
- **Other Utilities:** `cors`, `dotenv`, `axios`, `nodemon`

## Features

- **Staff Management:** Add, update, view, and delete employee records. Handle employee logins.
- **Supplier Management:** Keep track of suppliers and their categories.
- **Inventory & Stock:** Manage product deliveries, keep track of current stock, and monitor expired products.
- **Billing & Sales:** Generate bills, process payments, and automatically update stock upon sales.
- **Reports & Analytics:** Calculate profits and losses. Generate summaries by category, product, or date range. View monthly and yearly statistics.
- **Real-time Updates:** Emits real-time socket events for status changes (`statusChanged:id`) and stock updates (`stockUpdated`).

## Prerequisites

Before running the application locally, ensure you have the following installed:
- Node.js (v14 or higher recommended)
- MySQL database server

## Setup and Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd Supermarket-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following configuration:
   ```env
   # Database connection string (e.g., TiDB, Aiven, or local MySQL URL)
   DB_URL=mysql://<username>:<password>@<host>:<port>/<database_name>
   ```
   *(Note: The project uses a connection URI string. Make sure to provide the valid credentials to connect to your MySQL instance.)*

4. **Database Setup:**
   Ensure your MySQL database has the required tables: `employee`, `supplier`, `delivery`, `products`, `expired`, and `sales`. Please follow the database details according to the report in the [SuperMarket](https://github.com/kv-18-vk/SuperMarket) repository for the exact schemas and configurations.

## Running the Server

To start the server in development mode with auto-reloading (`nodemon`):

```bash
npm start
```

The server will be running on `http://localhost:3000`.

## Key API Endpoints

### Authentication
- `POST /login`: Authenticate an employee

### Staff
- `GET /staff`: Retrieve all employees
- `POST /staff/addemployee`: Add a new employee
- `POST /staff/update`: Update employee details
- `POST /staff/deleteemployee`: Remove an employee

### Suppliers & Deliveries
- `GET /suppliers`: List all suppliers
- `POST /suppliers/Add`: Add a new supplier
- `GET /deliveries`: View past deliveries
- `POST /deliveries/Add`: Record a new delivery and update stock

### Inventory
- `GET /stock`: View available stock
- `GET /expired`: View expired products

### Sales & Billing
- `POST /makebill`: Calculate total bill from a list of items
- `POST /payment`: Record a sale and automatically decrement stock

### Analytics & Reports
- `POST /api/profits/summary`: Profit summary over a date range
- `POST /api/loss/summary`: Loss summary over a date range
- `POST /report/monthly-stats`: Monthly profit and loss statistics
- `GET /report/yearly-stats`: Yearly profit and loss statistics

## License

ISC
