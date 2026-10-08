export type Role = 'SUPER_ADMIN' | 'HR_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
export interface EmployeeRef { _id: string; employeeId: string; fullName: string; profilePhoto?: { url: string } }
export interface User { _id: string; email: string; role: Role; employee?: EmployeeRef }
export interface ApiEnvelope<T> { success: boolean; data: T; meta?: { page: number; limit: number; total: number; pages: number }; error?: { message: string } }
export interface DashboardData { totalEmployees: number; activeEmployees: number; presentToday: number; absentToday: number; onLeaveToday: number; lateToday: number; pendingLeave: number; pendingCorrections: number; todayAttendance?: { checkIn?: string; checkOut?: string; status: string } }
