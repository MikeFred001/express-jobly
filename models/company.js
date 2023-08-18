"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(`
        SELECT handle
        FROM companies
        WHERE handle = $1`, [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(`
      INSERT INTO companies (handle,
                              name,
                              description,
                              num_employees,
                              logo_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
          handle,
          name,
          description,
          num_employees AS "numEmployees",
          logo_url AS "logoUrl"`, [
      handle,
      name,
      description,
      numEmployees,
      logoUrl,
    ],
    );
    const company = result.rows[0];

    return company;
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
    if (Number(queries.minEmployees) > Number(queries.maxEmployees)) {
      throw new BadRequestError();
    }

    const whereConditions = [];
    const values = [];

    // Builds WHERE clause for SQL query based on given query parameters
    if ("name" in queries) {
      whereConditions.push(`name ILIKE '%' || $${values.length + 1} || '%'`);
      values.push(queries.name);
    };

    if ("minEmployees" in queries) {
      whereConditions.push(`num_employees >= $${values.length + 1}`);
      values.push(queries.minEmployees);
    };

    if ("maxEmployees" in queries) {
      whereConditions.push(`num_employees <= $${values.length + 1}`);
      values.push(queries.maxEmployees);
    };

    const whereClause = whereConditions.length > 0 ?
      'WHERE ' + whereConditions.join(' AND ') : '';

    const companiesRes = await db.query(`
      SELECT handle,
             name,
             description,
             num_employees AS "numEmployees",
             logo_url      AS "logoUrl"
      FROM companies
      ${whereClause}
      ORDER BY name
    `, values
    );

    return companiesRes.rows;
  }


  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const jobsRes = await db.query(`
      SELECT id,
             title,
             salary,
             equity
      FROM jobs
      WHERE company_handle = $1
      ORDER BY salary
    `,[handle]);

    const companyRes = await db.query(`
      SELECT handle,
              name,
              description,
              num_employees AS "numEmployees",
              logo_url      AS "logoUrl"
      FROM companies
      WHERE handle = $1`, [handle]);

    const company = companyRes.rows[0];
    const jobs = jobsRes.rows;
    company.jobs = jobs;

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
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

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE companies
        SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
            handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(`
        DELETE
        FROM companies
        WHERE handle = $1
        RETURNING handle`, [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
