export class PrOverviewData {
    constructor(public title: string, public num: number, public repoOwner: string, public repoName: string) {
    }
}

export class PrOverviewCategory {
    constructor(public title: string, public overviews: PrOverviewData[]) {
    }
}
