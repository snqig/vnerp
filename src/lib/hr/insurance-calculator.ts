export interface SocialInsuranceResult {
  personal: {
    pension: number;
    medical: number;
    unemployment: number;
    total: number;
  };
  enterprise: {
    pension: number;
    medical: number;
    unemployment: number;
    injury: number;
    maternity: number;
    total: number;
  };
}

export interface HousingFundResult {
  personal: number;
  enterprise: number;
}

/**
 * 社保计算
 * 个人: 养老8% + 医疗2% + 失业0.5% = 10.5%
 * 企业: 养老16% + 医疗8% + 失业0.5% + 工伤0.5% + 生育0.5% = 25.5%
 */
export function calculateSocialInsurance(base: number): SocialInsuranceResult {
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    personal: {
      pension: round(base * 0.08),
      medical: round(base * 0.02),
      unemployment: round(base * 0.005),
      total: round(base * 0.105),
    },
    enterprise: {
      pension: round(base * 0.16),
      medical: round(base * 0.08),
      unemployment: round(base * 0.005),
      injury: round(base * 0.005),
      maternity: round(base * 0.005),
      total: round(base * 0.255),
    },
  };
}

/**
 * 公积金计算
 * @param base 缴存基数
 * @param rate 缴存比例 (5-12)
 */
export function calculateHousingFund(
  base: number,
  rate: number
): HousingFundResult {
  const round = (n: number) => Math.round(n * 100) / 100;
  const amount = round(base * (rate / 100));
  return { personal: amount, enterprise: amount };
}

/**
 * 社保基数校验（不低于当地最低工资）
 */
export function validateSocialInsuranceBase(
  base: number,
  localMinWage: number = 2500
): { valid: boolean; message?: string } {
  if (base < localMinWage) {
    return {
      valid: false,
      message: `社保基数 ${base} 低于最低工资 ${localMinWage}`,
    };
  }
  return { valid: true };
}
