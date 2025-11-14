import pkg from 'pg';
import dotenv from 'dotenv';

//parsing data from dotenv file
dotenv.config();

const{Pool} = pkg;

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 5432)
});

//error handling for idle clients
pool.on("error", (err, client)=>{
    console.error("unexpected error on idle client: ", err);
    process.exit(-1);
});


//A wrapper function for pool.query()
export async function query(text, params) {
    const response = await pool.query(text, params);
    return response;
}

//helper to get a client for transaction and to return it safely
export async function getClient() {
    const client = await pool.connect();
    const release = client.release;

    let released = false;
    client.release = ()=>{
        if(!released){
            released = true;
            release.call(client);
        }
    }

    return client;
}

export default pool;