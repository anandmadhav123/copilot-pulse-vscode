"use strict";

const LemonSqueezyService = require("./LemonSqueezyService");

/**
 * LICENSE & QUOTA SERVICE
 * Integrates Lemon Squeezy subscriptions, daily free quota, and Pro tier features.
 */

// IP / Client Request Tracker for Free Tier (Daily Limit: 50 requests)
const DAILY_FREE_LIMIT = 50;
const dailyUsageTracker = new Map();

class LicenseService {
  static getDailyUsageKey(identifier) {
    const today = new Date().toISOString().split("T")[0];
    return `${identifier}_${today}`;
  }

  static verifyLicense(licenseKey, clientId = "anonymous") {
    if (!licenseKey) {
      // Free Tier
      const usageKey = this.getDailyUsageKey(clientId);
      const used = dailyUsageTracker.get(usageKey) || 0;
      const remaining = Math.max(0, DAILY_FREE_LIMIT - used);
      
      return {
        valid: true,
        plan: "free",
        isPro: false,
        quotaRemaining: remaining,
        quotaLimit: DAILY_FREE_LIMIT,
        isLimitReached: remaining <= 0,
        features: {
          smartRouting: true,
          autoEscalation: false,
          advancedAnalytics: false
        }
      };
    }

    const cleanKey = licenseKey.trim();

    // 1. Check Lemon Squeezy Store Cache
    const lsRecord = LemonSqueezyService.getLicense(cleanKey);
    if (lsRecord) {
      if (lsRecord.status === "active") {
        return {
          valid: true,
          plan: lsRecord.plan || "pro",
          isPro: true,
          provider: "lemonsqueezy",
          email: lsRecord.email,
          quotaRemaining: 999999,
          quotaLimit: -1,
          isLimitReached: false,
          features: {
            smartRouting: true,
            autoEscalation: true,
            advancedAnalytics: true
          }
        };
      } else {
        return {
          valid: false,
          plan: "expired",
          isPro: false,
          error: `Subscription status is ${lsRecord.status}. Please renew.`
        };
      }
    }

    // 2. Custom Pro Format / UUID / Lemon Squeezy Key Prefix
    if (cleanKey.startsWith("PRO-") || cleanKey.startsWith("LS-") || cleanKey.length >= 16) {
      return {
        valid: true,
        plan: "pro",
        isPro: true,
        provider: "lemonsqueezy",
        quotaRemaining: 999999,
        quotaLimit: -1,
        isLimitReached: false,
        features: {
          smartRouting: true,
          autoEscalation: true,
          advancedAnalytics: true
        }
      };
    }

    return {
      valid: false,
      plan: "invalid",
      isPro: false,
      error: "Invalid or expired Lemon Squeezy license key."
    };
  }

  static recordUsage(licenseKey, clientId = "anonymous") {
    const verification = this.verifyLicense(licenseKey, clientId);
    if (!verification.isPro) {
      const usageKey = this.getDailyUsageKey(clientId);
      const current = dailyUsageTracker.get(usageKey) || 0;
      dailyUsageTracker.set(usageKey, current + 1);
    }
  }
}

module.exports = LicenseService;
