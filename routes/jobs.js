"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, isAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const getJobsSchema = require("../schemas/getJobs.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
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
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (string)
 * - minSalary (integer)
 * - hasEquity (true/false)
 *
 * Validates that fields are correct data type.
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  const queries = req.query;

  if ("minSalary" in queries) {
    queries.minSalary = Number(queries.minSalary);
  }
  if ("hasEquity" in queries) {
    queries.hasEquity = queries.hasEquity === "true" ? true : false;
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

/** GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, companyHandle }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(req.params.id);
  return res.json({ job });
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
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

/** DELETE /[id]  =>  { deleted: id }
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
