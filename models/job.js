"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {

  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    // const duplicateCheck = await db.query(`
    //     SELECT id
    //     FROM jobs
    //     WHERE id = $1`, [id]);

    // if (duplicateCheck.rows[0])
    //   throw new BadRequestError(`Duplicate job: ${id}`);

    // TODO: Ask if the above code is needed/how to deal with SERIAL PK

    const companyRes = await db.query(`
      SELECT handle
        FROM companies
        WHERE handle = $1
    `, [companyHandle]);

    if (!companyRes.rows[0]) throw new NotFoundError();


    const result = await db.query(`
      INSERT INTO jobs (title,
                        salary,
                        equity,
                        company_handle)
      VALUES ($1, $2, $3, $4)
      RETURNING
          id,
          title,
          salary,
          equity,
          company_handle AS "companyHandle"`, [
      title,
      salary,
      equity,
      companyHandle,
    ]);
    const job = result.rows[0];

    return job;
  }

  /** Takes a req.query object with search query parameters,
  * { name, minEmployees, maxEmployees }
  *
  * Returns rows from database according to search criteria
  * [{ handle, name, description, numEmployees, logoUrl }, ...]
  *
  * Returns all companies if no query is entered.
  *
  * Throws an error if minEmployees is greater than max employees
  */

  static async findAll(queries) {

    const clauseStatements = [];
    const values = [];

    if ("title" in queries) {
      clauseStatements.push(`title ILIKE '%' || $${values.length + 1} || '%'`);
      values.push(queries.title);
    };

    if ("minSalary" in queries) {
      clauseStatements.push(`salary >= $${values.length + 1}`);
      values.push(queries.minSalary);
    };

    if ("hasEquity" in queries && queries.hasEquity === true) {
      clauseStatements.push(`equity > $${values.length + 1}`);
      values.push(0);
    };

    const whereClause = clauseStatements.length > 0 ?
      'WHERE ' + clauseStatements.join(' AND ') : '';

    const jobsRes = await db.query(`
      SELECT id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"
        FROM jobs
        ${whereClause}
        ORDER BY id
    `, values);

    return jobsRes.rows;
  }


  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(`
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`, [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        companyHandle: "company_handle",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE jobs
        SET ${setCols}
        WHERE id = ${handleVarIdx}
        RETURNING
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(`
        DELETE
        FROM jobs
        WHERE id = $1
        RETURNING id`, [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;