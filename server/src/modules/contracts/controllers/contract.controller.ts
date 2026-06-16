import type { Request, Response, NextFunction } from 'express';
import { contractService } from '../services/contract.service.js';
import type {
    LandlordLeaseTermsInput,
    LandlordIdentityInput,
    LandlordPropertyConfirmationInput,
    LandlordSignInput,
    TenantIdentityInput,
    TenantSignInput,
    VerifyPaymobPaymentInput,
    WalletTopupInitiateInput,
    WalletTopupVerifyInput,
    TenantPaymentHistoryItem,
} from '../interfaces/contract.interfaces.js';

/**
 * Contract Controller
 * Handles HTTP request/response for contract endpoints
 */
class ContractController {
    async getTestingClock(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const state = contractService.getTestingClockState();
            res.status(200).json({ success: true, data: state });
        } catch (error) {
            next(error);
        }
    }

    async advanceTestingClock(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const days = Number((req.body as any)?.days ?? 5);
            let state;
            if (days < 0) {
                const currentState = contractService.getTestingClockState();
                const currentOffset = currentState.offsetDays;
                const targetOffset = Math.max(0, currentOffset + days);
                
                await contractService.resetTestingClockWithRestore();
                if (targetOffset > 0) {
                    state = await contractService.advanceTestingClockWithSnapshot(targetOffset);
                } else {
                    state = contractService.getTestingClockState();
                }
            } else {
                state = await contractService.advanceTestingClockWithSnapshot(days);
            }

            // After clock advances, autopay-eligible contracts for the calling
            // tenant settle automatically so the simulated time-jump reflects
            // reality (no skipped months while testing).
            let autopay = { contractsSettled: 0 };
            try {
                const userId = (req as any).user?.userId as string | undefined;
                const role = (req as any).user?.role as string | undefined;
                if (userId && role === 'TENANT') {
                    autopay = await contractService.runAutopaySweepForTenant(userId);
                }
            } catch {
                // Sweep failures are non-fatal: clock state still moves forward.
            }

            res.status(200).json({
                success: true,
                message: days < 0
                    ? `Testing clock set back by ${Math.abs(days)} day(s).`
                    : `Testing clock advanced by ${Math.floor(days)} day(s).`,
                data: { ...state, autopay },
            });
        } catch (error) {
            next(error);
        }
    }

    async resetTestingClock(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Restore all DB state to what it was before the first clock advance.
            const state = await contractService.resetTestingClockWithRestore();
            res.status(200).json({
                success: true,
                message: 'Testing clock reset. All data restored to pre-advance state.',
                data: state,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/contracts/landlord
     */
    async getLandlordContracts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const landlordId = (req as any).user.userId;
            const filters = (req as any).validatedQuery || req.query;
            const result = await contractService.getLandlordContracts(landlordId, filters);

            res.status(200).json({
                success: true,
                data: result.contracts,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/contracts/tenant
     */
    async getTenantContracts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = (req as any).user.userId;
            const filters = (req as any).validatedQuery || req.query;
            const result = await contractService.getTenantContracts(tenantId, filters);

            res.status(200).json({
                success: true,
                data: result.contracts,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/contracts/:id
     */
    async getContractById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;
            const contract = await contractService.getContractById(id as string, userId);

            res.status(200).json({
                success: true,
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/contracts/:id/verification-summary
     */
    async getVerificationSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;
            const summary = await contractService.getVerificationSummary(id as string, userId);

            res.status(200).json({
                success: true,
                data: summary,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/contracts/:id/landlord/lease-terms
     */
    async submitLandlordLeaseTerms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user.userId;
            const input: LandlordLeaseTermsInput = req.body;
            const contract = await contractService.submitLandlordLeaseTerms(id as string, landlordId, input);

            res.status(200).json({
                success: true,
                message: 'Lease terms submitted successfully',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/contracts/:id/landlord/identity
     */
    async submitLandlordIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user.userId;
            const input: LandlordIdentityInput = req.body;
            const contract = await contractService.submitLandlordIdentity(id as string, landlordId, input);

            res.status(200).json({
                success: true,
                message: 'Identity details submitted successfully',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/contracts/:id/landlord/property-confirmation
     */
    async submitLandlordPropertyConfirmation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user.userId;
            const input: LandlordPropertyConfirmationInput = req.body;
            const contract = await contractService.submitLandlordPropertyConfirmation(id as string, landlordId, input);

            res.status(200).json({
                success: true,
                message: 'Property confirmation submitted successfully',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/contracts/:id/landlord/sign
     */
    async signContractLandlord(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user.userId;
            const input: LandlordSignInput = req.body;
            const contract = await contractService.signContractLandlord(id as string, landlordId, input);

            res.status(200).json({
                success: true,
                message: 'Contract signed by landlord successfully',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/contracts/:id/tenant/identity
     */
    async submitTenantIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const input: TenantIdentityInput = req.body;
            const contract = await contractService.submitTenantIdentity(id as string, tenantId, input);

            res.status(200).json({
                success: true,
                message: 'Identity verification submitted successfully',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/contracts/:id/tenant/sign
     */
    async signContractTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const input: TenantSignInput = req.body;
            const contract = await contractService.signContractTenant(id as string, tenantId, input);

            res.status(200).json({
                success: true,
                message: 'Contract signed by tenant successfully. Contract is now active!',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/contracts/:id/payments/paymob/initiate
     */
    async initiatePaymobPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const checkout = await contractService.initiatePaymobPayment(id as string, tenantId);

            res.status(200).json({
                success: true,
                data: checkout,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/contracts/:id/payments/paymob/verify
     */
    async verifyPaymobPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const input: VerifyPaymobPaymentInput = req.body;
            const contract = await contractService.verifyPaymobPayment(id as string, tenantId, input);

            res.status(200).json({
                success: true,
                message: 'Payment verified successfully. Contract is now active.',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/contracts/payments/wallet/balance
     */
    async getWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = (req as any).user.userId;
            const balance = await contractService.getWalletBalance(tenantId);

            res.status(200).json({
                success: true,
                data: balance,
            });
        } catch (error) {
            next(error);
        }
    }

    async withdrawWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user.userId;
            const amount = Number((req.body as any)?.amount ?? 0);
            const balance = await contractService.withdrawWalletBalance(userId, amount);

            res.status(200).json({
                success: true,
                message: 'Wallet withdrawal completed successfully.',
                data: balance,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/contracts/:id/payments/balance/pay
     */
    async payContractFromBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const result = await contractService.payContractFromBalance(id as string, tenantId);

            res.status(200).json({
                success: true,
                message: 'Contract payment completed from wallet balance.',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/contracts/:id/payments/balance/pay-rent
     */
    async payMonthlyRentFromBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const result = await contractService.payMonthlyRentFromBalance(id as string, tenantId);

            res.status(200).json({
                success: true,
                message: `Monthly rent for ${result.paidForMonth} paid from wallet balance.`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/contracts/payments/wallet/topup/initiate
     */
    async initiateWalletTopup(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = (req as any).user.userId;
            const input: WalletTopupInitiateInput = req.body;
            const checkout = await contractService.initiateWalletTopup(tenantId, input);

            res.status(200).json({
                success: true,
                data: checkout,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/contracts/payments/wallet/topup/verify
     */
    async verifyWalletTopup(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = (req as any).user.userId;
            const input: WalletTopupVerifyInput = req.body;
            const balance = await contractService.verifyWalletTopup(tenantId, input);

            res.status(200).json({
                success: true,
                message: 'Wallet top-up verified successfully.',
                data: balance,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/contracts/:id/installments
     */
    async getContractInstallments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const callerId = (req as any).user.userId;
            const data = await contractService.getContractInstallments(id as string, callerId);
            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/contracts/:id/autopay
     */
    async updateAutopay(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const tenantId = (req as any).user.userId;
            const enabled = Boolean((req.body as any)?.enabled);
            const data = await contractService.setContractAutopay(id as string, tenantId, enabled);
            res.status(200).json({
                success: true,
                message: `Autopay ${enabled ? 'enabled' : 'disabled'} for contract.`,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/contracts/payments/history
     */
    async getTenantPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = (req as any).user.userId;
            const limit = req.query.limit ? Number(req.query.limit) : 100;
            const rows: TenantPaymentHistoryItem[] = await contractService.getTenantPaymentHistory(tenantId, { limit });

            res.status(200).json({
                success: true,
                data: rows,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/contracts/:id/report-tenant
     */
    async reportTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const landlordId = (req as any).user?.userId as string;
            const { reason, details } = req.body;

            const report = await contractService.reportTenant(id as string, landlordId, { reason, details });

            res.status(200).json({
                success: true,
                message: 'Tenant reported successfully. The administration has been notified.',
                data: report,
            });
        } catch (error) {
            next(error);
        }
    }



    /**
     * POST /api/contracts/:id/terminate
     */
    async terminateLease(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.userId as string;
            const { reason, scenario, details } = req.body;
            
            const request = await contractService.requestLeaseTermination(
                id as string,
                userId,
                { reason, scenario, details }
            );

            res.status(200).json({
                success: true,
                message: 'Lease termination request submitted successfully.',
                data: request,
            });
        } catch (error) {
            next(error);
        }
    }
}

// Export singleton instance
export const contractController = new ContractController();
export default contractController;
