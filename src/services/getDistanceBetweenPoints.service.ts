export class GetDistanceBetweenPointsService {
    run(lat1: number, lng1: number, lat2: number, lng2: number): number {
        // El radio del planeta tierra en metros.
        let R = 6378137;
        let dLat = this.degreesToRadians(lat2 - lat1);
        let dLong = this.degreesToRadians(lng2 - lng1);
        let a = Math.sin(dLat / 2)
            *
            Math.sin(dLat / 2)
            +
            Math.cos(this.degreesToRadians(lat1))
            *
            Math.cos(this.degreesToRadians(lat1))
            *
            Math.sin(dLong / 2)
            *
            Math.sin(dLong / 2);

        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let distance = R * c;

        return distance;
    }

    private degreesToRadians(degrees: number) {
        return degrees * Math.PI / 180;
    }
}