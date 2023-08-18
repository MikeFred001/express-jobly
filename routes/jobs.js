"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, isAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const getJobsSchema = require("../schemas/getJobs.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: logged in, and an admin
 */

router.post("/", ensureLoggedIn, isAdmin, async function (req, res, next) {

  const validator = jsonschema.validate(
    req.body,
    jobNewSchema,
    { required: true }
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Throws error if minEmployees query is greater than maxEmployees
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  const queries = req.query;

  if ("minSalary" in queries) {
    queries.minSalary = Number(queries.minSalary);
  }
  if ("hasEquity" in queries) {
    queries.hasEquity = Boolean(queries.hasEquity);
  }

  const result = jsonschema.validate(
    queries,
    getJobsSchema,
    { required: true }
  );

  if (!result.valid) {
    const errs = result.errors.map(err => err.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.findAll(queries);
  return res.json({ jobs });
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(req.params.id);
  return res.json({ job });
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: logged in and an admin
 */

router.patch("/:id", ensureLoggedIn, isAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    jobUpdateSchema,
    { required: true }
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(req.params.id, req.body);
  return res.json({ job });
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: logged in and an admin
 */

router.delete("/:id",
  ensureLoggedIn,
  isAdmin,
  async function (req, res, next) {
    await Job.remove(req.params.id);
    return res.json({ deleted: req.params.id });
});


module.exports = router;
