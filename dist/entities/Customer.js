"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Customer = exports.CustomerStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var CustomerStatus;
(function (CustomerStatus) {
    CustomerStatus["PENDING"] = "pending";
    CustomerStatus["COMPLETED"] = "completed";
    CustomerStatus["CANCELLED"] = "cancelled";
})(CustomerStatus || (exports.CustomerStatus = CustomerStatus = {}));
let Customer = class Customer {
    id;
    names;
    email;
    phoneNumber;
    service;
    height;
    hovName;
    hovNumber;
    fatherName;
    motherName;
    spouseName;
    district;
    sector;
    cell;
    street;
    village;
    status;
    createdAt;
    updatedAt;
    deletedAt;
    updatedBy;
};
exports.Customer = Customer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Customer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], Customer.prototype, "names", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], Customer.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], Customer.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], Customer.prototype, "service", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "hovName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "hovNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "fatherName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "motherName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "spouseName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "sector", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "cell", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "street", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "village", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: CustomerStatus,
        default: CustomerStatus.PENDING,
    }),
    __metadata("design:type", String)
], Customer.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], Customer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], Customer.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "updatedBy" }),
    __metadata("design:type", Object)
], Customer.prototype, "updatedBy", void 0);
exports.Customer = Customer = __decorate([
    (0, typeorm_1.Entity)("customers")
], Customer);
//# sourceMappingURL=Customer.js.map