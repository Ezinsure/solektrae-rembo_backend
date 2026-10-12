import { Router } from "express";
import { getPublicServices } from "../controllers/service.controller";
import { submitPublicCustomer } from "../controllers/customer.controller";

const PublicRoutes = Router();

PublicRoutes.get("/:companySlug/services", getPublicServices);
PublicRoutes.post("/:companySlug/customers", submitPublicCustomer);

export default PublicRoutes;