"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {

  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if companyHandle cannot be matched to a company
   * in the companies table.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const companyRes = await db.query(`
      SELECT handle
        FROM companies
        WHERE handle = $1
    `, [companyHandle]);

    if (!companyRes.rows[0]) throw new NotFoundError();

    const jobRes = await db.query(`
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
          company_handle AS "companyHandle"`,
          [title, salary, equity, companyHandle]);

    const job = jobRes.rows[0];

    return job;
  }

  /** Takes a req.query object with search query parameters,
  * { title, minSalary, hasEquity }
  *
  * Returns rows from database according to search criteria
  * [{ id, title, salary, equity, companyHandle }, ...]
  *
  * Returns all jobs if no query is entered.
  *
  */

  static async findAll(queries) {
    const whereConditions = [];
    const values = [];

    if ("title" in queries) {
      whereConditions.push(`title ILIKE '%' || $${values.length + 1} || '%'`);
      values.push(queries.title);
    };

    if ("minSalary" in queries) {
      whereConditions.push(`salary >= $${values.length + 1}`);
      values.push(queries.minSalary);
    };

    if ("hasEquity" in queries && queries.hasEquity === true) {
      whereConditions.push(`equity > $${values.length + 1}`);
      values.push(0);
    };

    const whereClause = whereConditions.length > 0 ?
      'WHERE ' + whereConditions.join(' AND ') : '';

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


  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
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

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
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

  /** Delete given job from database; returns undefined.
   *
   * Returns { deleted: id }
   *
   * Throws NotFoundError if job not found.
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