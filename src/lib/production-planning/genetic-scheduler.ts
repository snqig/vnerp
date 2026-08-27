export interface ProductionJob {
  jobId: number;
  workOrderId: number;
  machineId: number;
  duration: number;
  dueDate: Date;
  priority: number;
  setupTime: number;
}

export interface ScheduledItem {
  job: ProductionJob;
  startTime: Date;
  endTime: Date;
}

export interface Schedule {
  jobs: ScheduledItem[];
  makespan: number;
  lateness: number;
  cost: number;
}

export class GeneticScheduler {
  private populationSize = 100;
  private generations = 50;
  private mutationRate = 0.15;
  private crossoverRate = 0.8;

  constructor(
    private jobs: ProductionJob[],
    private machines: { id: number; capacity: number }[]
  ) {}

  private initializePopulation(): number[][] {
    const population: number[][] = [];
    for (let i = 0; i < this.populationSize; i++) {
      const chromosome = [...Array(this.jobs.length).keys()];
      for (let j = chromosome.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [chromosome[j], chromosome[k]] = [chromosome[k], chromosome[j]];
      }
      population.push(chromosome);
    }
    return population;
  }

  private constructSchedule(chromosome: number[]): Schedule {
    const schedule: ScheduledItem[] = [];
    const machineEndTimes = new Map<number, Date>(this.machines.map((m) => [m.id, new Date()]));

    for (const jobIdx of chromosome) {
      const job = this.jobs[jobIdx];
      const machineStart = machineEndTimes.get(job.machineId) || new Date();
      const startTime = new Date(machineStart.getTime());
      const endTime = new Date(startTime.getTime() + (job.duration + job.setupTime) * 60000);
      schedule.push({ job, startTime, endTime });
      machineEndTimes.set(job.machineId, endTime);
    }

    const makespan =
      Math.max(...Array.from(machineEndTimes.values()).map((d) => d.getTime())) -
      new Date().getTime();
    let lateness = 0;
    for (const item of schedule) {
      if (item.endTime > item.job.dueDate) lateness++;
    }
    const cost = schedule.reduce((sum, item) => sum + item.job.setupTime * 50, 0);

    return { jobs: schedule, makespan, lateness, cost };
  }

  private evaluateFitness(chromosome: number[]): number {
    const schedule = this.constructSchedule(chromosome);
    return (
      0.4 * (schedule.makespan / 3600) + 0.35 * schedule.lateness * 1000 + 0.25 * schedule.cost
    );
  }

  private selectParent(population: number[][], fitnesses: number[]): number[] {
    const maxFitness = Math.max(...fitnesses);
    const weights = fitnesses.map((f) => maxFitness - f + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < population.length; i++) {
      random -= weights[i];
      if (random <= 0) return population[i];
    }
    return population[0];
  }

  private crossover(parent1: number[], parent2: number[]): number[] {
    const size = parent1.length;
    const cut1 = Math.floor(Math.random() * size);
    const cut2 = Math.floor(Math.random() * size);
    const [start, end] = cut1 < cut2 ? [cut1, cut2] : [cut2, cut1];
    const child: number[] = Array(size).fill(-1);
    for (let i = start; i < end; i++) child[i] = parent1[i];
    let pos = end;
    for (let i = 0; i < size; i++) {
      const gene = parent2[i];
      if (!child.includes(gene)) {
        if (pos >= size) pos = 0;
        child[pos] = gene;
        pos++;
      }
    }
    return child;
  }

  private mutate(chromosome: number[]): number[] {
    if (Math.random() > this.mutationRate) return chromosome;
    const idx1 = Math.floor(Math.random() * chromosome.length);
    const idx2 = Math.floor(Math.random() * chromosome.length);
    const mutated = [...chromosome];
    [mutated[idx1], mutated[idx2]] = [mutated[idx2], mutated[idx1]];
    return mutated;
  }

  async optimize(): Promise<Schedule> {
    let population = this.initializePopulation();
    let bestSchedule: Schedule | null = null;
    let bestFitness = Infinity;

    for (let gen = 0; gen < this.generations; gen++) {
      const fitnesses = population.map((chr) => this.evaluateFitness(chr));
      for (let i = 0; i < fitnesses.length; i++) {
        if (fitnesses[i] < bestFitness) {
          bestFitness = fitnesses[i];
          bestSchedule = this.constructSchedule(population[i]);
        }
      }
      const newPopulation: number[][] = [];
      const eliteSize = Math.ceil(this.populationSize * 0.1);
      const sortedIdx = [...Array(population.length).keys()].sort(
        (a, b) => fitnesses[a] - fitnesses[b]
      );
      for (let i = 0; i < eliteSize; i++) newPopulation.push([...population[sortedIdx[i]]]);
      while (newPopulation.length < this.populationSize) {
        if (Math.random() < this.crossoverRate) {
          const parent1 = this.selectParent(population, fitnesses);
          const parent2 = this.selectParent(population, fitnesses);
          newPopulation.push(this.mutate(this.crossover(parent1, parent2)));
        } else {
          newPopulation.push(this.mutate([...this.selectParent(population, fitnesses)]));
        }
      }
      population = newPopulation;
    }
    return bestSchedule || this.constructSchedule(population[0]);
  }
}
