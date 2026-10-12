import { Router } from "express";
import {
  createCompany, getCurrentCompany, listMyCompanies, removeLogo, updateCurrentCompany,
  uploadLogo,
} from "../../controllers/companyController";
import { authenticate } from "../../middleware/authMiddleware";
import { UserRole } from "../../entities/User";
import { authorize } from "../../middleware/roleMiddleware";
import { singleImage } from "../../middleware/uploadImage";

const CompanyRoutes = Router();

CompanyRoutes.get("/current", authenticate, getCurrentCompany);                                       
CompanyRoutes.patch("/current", authenticate, authorize(UserRole.ADMIN , UserRole.DEV), updateCurrentCompany);     
CompanyRoutes.get("/mine", authenticate, listMyCompanies);                                             
CompanyRoutes.post("/", authenticate, authorize(UserRole.ADMIN, UserRole.DEV), createCompany); 
CompanyRoutes.post("/current/logo", authenticate, authorize(UserRole.ADMIN, UserRole.DEV), singleImage("image"),uploadLogo);
CompanyRoutes.delete("/current/logo", authenticate, authorize(UserRole.ADMIN, UserRole.DEV), removeLogo);    

export default CompanyRoutes;
