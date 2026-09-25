import { lazy } from 'react'

export const CategoriesPage = lazy(() => import('./categories-page').then((module) => ({ default: module.CategoriesPage })))
export const ProductsPage = lazy(() => import('./products-page').then((module) => ({ default: module.ProductsPage })))
export const SuppliersPage = lazy(() => import('./suppliers-page').then((module) => ({ default: module.SuppliersPage })))
export const DepartmentsPage = lazy(() => import('./departments-page').then((module) => ({ default: module.DepartmentsPage })))
export const UsersPage = lazy(() => import('./users-page').then((module) => ({ default: module.UsersPage })))
export const RolesPage = lazy(() => import('./access-page').then((module) => ({ default: module.RolesPage })))
export const PermissionsPage = lazy(() => import('./access-page').then((module) => ({ default: module.PermissionsPage })))
export const HealthPage = lazy(() => import('./health-page').then((module) => ({ default: module.HealthPage })))
