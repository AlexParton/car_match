<script>
export let car
export let matched = false
</script>

<style>
 .carCard {
    border-radius: 35px;
    box-shadow: 10px 10px 30px #e3e3e3, -10px -10px 30px #ffffff;
    margin: 20px 0;
    background: white;
 }

 .carCard.matched {
     box-shadow: none;
 } 

 .text {
    padding: 0 15px 15px;
 }

 h2 {
     font-size: 14px;
 }

 h2 span {
     font-size: inherit;
     font-weight: 200;
     padding-left: 10px;
 }

 .specs, .checkout {
    padding: 10px 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
 }

 .spec-item {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    width: 44%;
    font-size: 12px;
    font-weight: 200;
    padding: 4px 0;
 }

 .spec-item:nth-child(even){
    width: 55%;
 }

 .spec-item span, .price span {
     padding-left: 5px;
     font-weight: 500;
 }

 .price {
    font-size: 12px;
    font-weight: 200;
    width: 50%;
 }

 .price span {
     font-size: 16px;
 }

 button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 10px;
    background: none;
    border: 1px dotted #969696;
    border-radius: 10px;
    margin: auto;
    height: 25px;
    width: 110px;
 }

h2.matched {
    padding: 20px 0;
    text-align: center;
    font-size: 20px;
    font-family: 'Racing Sans One';
}

@media(min-width: 768px) {
    .carCard {
        width: 32%
    }
}

</style>

<div class="{(matched) ? 'carCard matched' : 'carCard'}">
    {#if matched}
        <h2 class="matched">It's a Match!</h2>
    {/if}
    <div class="img-wrapper">
        <img src="{car.imageUrl}" alt="car">
    </div>
    <div class="text">
        <div class="title">
            <h2>{car.maker} {car.model} <span>{car.version}</span></h2>
        </div>
        <div class="specs">
            <div class="spec-item">
                <p>Year:</p><span>{car.year}</span>
            </div>
            <div class="spec-item">
                <p>Mileage:</p><span>{car.mileage} kms.</span>
            </div>
            <div class="spec-item">
                <p>Type:</p><span>{car.type}</span>
            </div>
            <div class="spec-item">
                <p>Fuel:</p><span>{car.fuel}</span>
            </div>
        </div>
        <div class='checkout'>
            <div class="price">Price: <span>{car.price} €</span></div>
            <button>Contact Seller</button> 
        </div>
        
    </div>
       
    
</div>