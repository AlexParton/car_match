export class CarModel {
    constructor(
        imageUrl,
        maker, 
        model, 
        version, 
        color,
        colorCode, 
        fuel,
        consumeCode,
        power,
        powerCode,
        year, 
        mileage, 
        mileageCode,
        type,
        typeCode,
        price,
        priceCode, 
        volumeCode) {
            this.imageUrl = imageUrl;
            this.maker = maker;
            this.model = model;
            this.version = version;
            this.color = color;
            this.colorCode = colorCode;
            this.fuel = fuel;
            this.consumeCode = consumeCode;
            this.power = power;
            this.powerCode = powerCode;
            this.year = year;
            this.mileage = mileage;
            this.mileageCode = mileageCode;
            this.type = type;
            this.typeCode = typeCode;
            this.price = price;
            this.priceCode = priceCode;
            this.volumeCode = volumeCode;
    }
}