export enum ForecastingMethod {
  NAIVE = 'naive',
  SMA = 'sma',
  EMA = 'ema',
  ARIMA = 'arima',
  SEASONAL = 'seasonal',
}

export class DemandForecaster {
  constructor(
    private historicalData: { date: string; quantity: number }[],
    private method: ForecastingMethod = ForecastingMethod.EMA
  ) {}

  forecastSMA(periods: number = 12, horizon: number = 3): number[] {
    if (this.historicalData.length < periods) {
      throw new Error(`需要至少 ${periods} 个历史数据点`);
    }
    const forecasts: number[] = [];
    const data = this.historicalData.slice(-periods).map((d) => d.quantity);
    const sma = data.reduce((sum, v) => sum + v, 0) / periods;
    for (let i = 0; i < horizon; i++) {
      forecasts.push(sma);
    }
    return forecasts;
  }

  forecastEMA(alpha: number = 0.3, horizon: number = 3): number[] {
    if (this.historicalData.length === 0) {
      throw new Error('没有历史数据');
    }
    const data = this.historicalData.map((d) => d.quantity);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = alpha * data[i] + (1 - alpha) * ema;
    }
    const forecasts: number[] = [];
    for (let i = 0; i < horizon; i++) {
      forecasts.push(ema);
    }
    return forecasts;
  }

  forecastSeasonal(seasonLength: number = 12, horizon: number = 3): number[] {
    if (this.historicalData.length < seasonLength) {
      throw new Error(`需要至少 ${seasonLength} 个历史数据点`);
    }
    const forecasts: number[] = [];
    const data = this.historicalData.map((d) => d.quantity);
    const seasonalFactors: number[] = [];
    for (let s = 0; s < seasonLength; s++) {
      let sum = 0;
      let count = 0;
      for (let i = s; i < data.length; i += seasonLength) {
        sum += data[i];
        count++;
      }
      seasonalFactors[s] = count > 0 ? sum / count : 0;
    }
    const baseLevel = data.reduce((sum, v) => sum + v, 0) / data.length;
    for (let h = 0; h < horizon; h++) {
      const seasonIdx = (data.length + h) % seasonLength;
      const forecast = baseLevel * (seasonalFactors[seasonIdx] / baseLevel || 1);
      forecasts.push(Math.max(0, forecast));
    }
    return forecasts;
  }

  forecastARIMA(horizon: number = 3): number[] {
    const data = this.historicalData.map((d) => d.quantity);
    if (data.length < 2) throw new Error('需要至少 2 个历史数据点');
    const diff: number[] = [];
    for (let i = 1; i < data.length; i++) {
      diff.push(data[i] - data[i - 1]);
    }
    const diffMean = diff.reduce((sum, v) => sum + v, 0) / diff.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 1; i < diff.length; i++) {
      numerator += (diff[i - 1] - diffMean) * (diff[i] - diffMean);
      denominator += Math.pow(diff[i - 1] - diffMean, 2);
    }
    const ar1Coeff = denominator !== 0 ? numerator / denominator : 0.5;
    const residuals: number[] = [];
    residuals[0] = diff[0] - diffMean;
    for (let i = 1; i < diff.length; i++) {
      residuals[i] = diff[i] - diffMean - ar1Coeff * (diff[i - 1] - diffMean);
    }
    const forecasts: number[] = [];
    let lastValue = data[data.length - 1];
    let lastError = residuals[residuals.length - 1];
    for (let h = 0; h < horizon; h++) {
      const forecast =
        lastValue + diffMean + ar1Coeff * (lastValue - data[data.length - 2]) + -0.3 * lastError;
      forecasts.push(Math.max(0, forecast));
      lastValue = forecast;
      lastError = 0;
    }
    return forecasts;
  }

  async selectBestMethod(): Promise<{ method: ForecastingMethod; mape: number }> {
    const testRatio = 0.2;
    const testSize = Math.ceil(this.historicalData.length * testRatio);
    const trainData = this.historicalData.slice(0, -testSize);
    const testData = this.historicalData.slice(-testSize);
    const results: Array<{ method: ForecastingMethod; mape: number }> = [];
    const methods = [
      ForecastingMethod.SMA,
      ForecastingMethod.EMA,
      ForecastingMethod.ARIMA,
      ForecastingMethod.SEASONAL,
    ];

    for (const method of methods) {
      const forecaster = new DemandForecaster(trainData, method);
      let forecasts: number[] = [];
      try {
        switch (method) {
          case ForecastingMethod.SMA:
            forecasts = forecaster.forecastSMA(Math.max(3, trainData.length / 3), testSize);
            break;
          case ForecastingMethod.EMA:
            forecasts = forecaster.forecastEMA(0.3, testSize);
            break;
          case ForecastingMethod.ARIMA:
            forecasts = forecaster.forecastARIMA(testSize);
            break;
          case ForecastingMethod.SEASONAL:
            forecasts = forecaster.forecastSeasonal(Math.max(4, trainData.length / 3), testSize);
            break;
        }
        let sumApe = 0;
        for (let i = 0; i < testData.length; i++) {
          const actual = testData[i].quantity;
          const predicted = forecasts[i] || 0;
          if (actual !== 0) sumApe += Math.abs((actual - predicted) / actual);
        }
        const mape = (sumApe / testData.length) * 100;
        results.push({ method, mape });
      } catch {
        continue;
      }
    }
    results.sort((a, b) => a.mape - b.mape);
    return results.length > 0 ? results[0] : { method: ForecastingMethod.EMA, mape: 0 };
  }
}
