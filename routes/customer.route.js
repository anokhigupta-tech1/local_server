import express from "express";

import {
    availableServicesCategories,
  getAllProfessionals,
  getAllServices,
} from "../controllers/customer.controller.js";

const router = express.Router();

router.get("/all-services", getAllServices);
router.get("/professionals", getAllProfessionals);
router.get("/services-categories", availableServicesCategories);
availableServicesCategories;
export const customerRouter = router;
