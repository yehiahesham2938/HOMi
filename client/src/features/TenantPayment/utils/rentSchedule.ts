import type { LandlordContract } from '../../../services/contract.service';
import { getTestingNowFromCache } from '../../../shared/utils/testingClock';

export interface RentCycleSummary {
    dueDate: Date;
    nextDueDate: Date;
    daysUntilDue: number;
    isPaidForCurrentCycle: boolean;
    periodStart: Date;
    periodEnd: Date;
}

export interface RentInstallmentStats {
    dueCount: number;
    overdueCount: number;
}

const getDueDay = (rentDueDate: LandlordContract['rentDueDate'], reference: Date): number => {
    if (rentDueDate === '5TH_OF_MONTH') return 5;
    if (rentDueDate === 'LAST_DAY_OF_MONTH') {
        return new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
    }
    return 1;
};

const getCycleDueDate = (contract: LandlordContract, reference: Date): Date => {
    const day = getDueDay(contract.rentDueDate, reference);
    return new Date(reference.getFullYear(), reference.getMonth(), day);
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isWithinNextDays = (from: Date, target: Date, days: number): boolean => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const deltaDays = Math.ceil((target.getTime() - from.getTime()) / msPerDay);
    return deltaDays >= 0 && deltaDays <= days;
};

const getNow = (nowInput?: Date): Date => {
    const cached = getTestingNowFromCache();
    return nowInput ? startOfDay(nowInput) : startOfDay(cached ?? new Date());
};

export const getRentCycleSummary = (contract: LandlordContract, nowInput?: Date): RentCycleSummary => {
    const now = getNow(nowInput);
    const moveIn = startOfDay(new Date(contract.moveInDate));
    if (Number.isNaN(moveIn.getTime())) {
        return {
            dueDate: now,
            nextDueDate: now,
            daysUntilDue: 0,
            isPaidForCurrentCycle: false,
            periodStart: now,
            periodEnd: now,
        };
    }

    const leaseMonths = Math.max(Number(contract.leaseDurationMonths ?? 0), 0);
    const dueDates: Date[] = [];
    for (let i = 0; i < leaseMonths; i += 1) {
        dueDates.push(new Date(moveIn.getFullYear(), moveIn.getMonth() + i + 1, moveIn.getDate()));
    }

    const paidAt = contract.paymentVerifiedAt ? startOfDay(new Date(contract.paymentVerifiedAt)) : null;
    let paidInstallments = 0;
    if (paidAt) {
        paidInstallments = dueDates.filter((d) => d <= paidAt).length + 1;
    }
    if (contract.status === 'ACTIVE' || contract.status === 'EXPIRED') {
        paidInstallments = Math.max(paidInstallments, 1);
    }

    const nextUnpaidIdx = Math.min(paidInstallments, dueDates.length - 1);
    const dueDate = dueDates[nextUnpaidIdx] ?? moveIn;
    const periodStart = nextUnpaidIdx === 0 ? moveIn : dueDates[nextUnpaidIdx - 1];
    const isPaidForCurrentCycle = now < periodStart;

    const followingDueDate = dueDates[nextUnpaidIdx + 1] ?? new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate());
    const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const periodStartForUnpaid = nextUnpaidIdx === 0 ? moveIn : dueDates[nextUnpaidIdx - 1];
    const periodEndForUnpaid = dueDate;

    const activePeriodStart = isPaidForCurrentCycle
        ? (nextUnpaidIdx <= 1 ? moveIn : dueDates[nextUnpaidIdx - 2])
        : periodStartForUnpaid;
    const activePeriodEnd = isPaidForCurrentCycle
        ? periodStartForUnpaid
        : periodEndForUnpaid;

    return {
        dueDate,
        nextDueDate: followingDueDate,
        daysUntilDue,
        isPaidForCurrentCycle,
        periodStart: activePeriodStart,
        periodEnd: activePeriodEnd,
    };
};

/**
 * Mirror of the server's `getPrepaidInstallmentsCount`.
 *
 * The activation payment for a contract always covers the first month of rent
 * (in addition to the security deposit and service fee), so once a contract is
 * ACTIVE/EXPIRED the first scheduled installment is treated as already paid —
 * regardless of whether the move-in date and the first scheduled due date fall
 * in the same calendar month.
 */
export const getPrepaidInstallmentsCount = (contract: LandlordContract): number => {
    if (contract.status !== 'ACTIVE' && contract.status !== 'EXPIRED') return 0;
    if (Number(contract.leaseDurationMonths ?? 0) <= 0) return 0;
    const moveIn = new Date(contract.moveInDate);
    if (Number.isNaN(moveIn.getTime())) return 0;
    return 1;
};

export const getRentInstallmentStats = (contract: LandlordContract, nowInput?: Date): RentInstallmentStats => {
    const now = getNow(nowInput);
    const moveIn = startOfDay(new Date(contract.moveInDate));
    if (Number.isNaN(moveIn.getTime())) return { dueCount: 0, overdueCount: 0 };
    const leaseMonths = Math.max(Number(contract.leaseDurationMonths ?? 0), 0);
    if (leaseMonths <= 0) return { dueCount: 0, overdueCount: 0 };

    const dueDates: Date[] = [];
    for (let i = 0; i < leaseMonths; i += 1) {
        dueDates.push(new Date(moveIn.getFullYear(), moveIn.getMonth() + i + 1, moveIn.getDate()));
    }

    let dueCount = 0;
    let overdueCount = 0;
    for (let i = 0; i < leaseMonths; i += 1) {
        const periodStart = i === 0 ? moveIn : dueDates[i - 1];
        const periodEnd = dueDates[i];
        if (now >= periodStart) {
            dueCount += 1;
            if (now >= periodEnd) {
                overdueCount += 1;
            }
        }
    }
    return { dueCount, overdueCount };
};

export const formatMoney = (amount: number): string =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateLabel = (date: Date | string | number): string => {
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};
