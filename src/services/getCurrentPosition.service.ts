export class GetCurrentPositionService {
    async run(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition((position) => {
                resolve(position);
            }, positionError => reject(positionError));
        });
    }
}