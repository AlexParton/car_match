<script>
    import { garage } from '../data/garage'
    import CarCard from './CarCard.svelte'
    import {Questions} from '../data/questions'
    import QuestionItem from './QuestionItem.svelte'
    import {scale, fade} from 'svelte/transition'

    let match = garage[0]
    let isMatch = false

    let budgetMultiplier = 3
    let volumeMultiplier = 3
    let fuelMultiplier = 3
    let typeMultiplier = 3
    let powerMultiplier = 3
    let mileageMultiplier = 3

    const handleInput = (event) => {
        const inputValue = event.detail[0]
        const field = event.detail[1]
        budgetMultiplier = (field === 'budget') && inputValue
        volumeMultiplier = (field === 'volume') && inputValue
        fuelMultiplier = (field === 'fuel') && inputValue
        typeMultiplier = (field === 'type') && inputValue
        mileageMultiplier = (field === 'mileage') && inputValue
        powerMultiplier = (field === 'power') && inputValue
    }

    const carFinder = () => {
        let ratio
        let updatedGarage = [...garage];
        for (let i = 0; i< updatedGarage.length; i++) {
            ratio = updatedGarage[i].priceCode * budgetMultiplier
            ratio += updatedGarage[i].volumeCode * volumeMultiplier
            ratio += updatedGarage[i].consumeCode * fuelMultiplier
            ratio += updatedGarage[i].typeCode * typeMultiplier
            ratio += updatedGarage[i].mileageCode * mileageMultiplier
            ratio += updatedGarage[i].powerCode * mileageMultiplier
            updatedGarage[i] = {...updatedGarage[i], ratio}
        }
        updatedGarage.sort((a,b) => (a.ratio > b.ratio) ? 1 : ((b.ratio > a.ratio) ? -1 : 0))
        match = updatedGarage[0]
        isMatch = true
    }

    const closeMatch = () => {
        isMatch = false
    }

</script>

<style>
    h2 {
        font-size: 22px;
    line-height: 22px;
    }
.matcher-wrapper {
    margin-top: 40px;
    padding: var(--padding);
}

.checkout {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 30px 0;
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
    height: 35px;
    width: 210px;
}

.match {
    position: fixed;
    top: 0;
    bottom: 0;
    background: #171717d1;
    padding: 60px 12px;
    backdrop-filter: blur(3px);
}

.match-close {
    color: white
}

@media(min-width: 768px) {
    .matcher-wrapper {
        padding: 50px;
    }

    .options {
        display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: stretch;
    }

    .options h2 {
        width: 100%;
    text-align: center;
    padding: 0 0 20px;
    }

    .match {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
    }

    .button-wrapper {
        width: 100%;
    }
}
</style>

<div class="matcher-wrapper">
    <div class="options">
        <h2>Let us find the car that fits your needs.</h2>
        {#each Questions as question }
            <QuestionItem {question} on:input={handleInput}/>
        {/each}
        
    </div>
    <div class="checkout">
        <button on:click="{carFinder}">FIND ME A CAR</button>
    </div>
</div>

{#if isMatch}
    <div transition:fade class='match'>
        <CarCard matched=true car={match} />
        <div class="button-wrapper">
            <button class="match-close" on:click="{closeMatch}">Keep Browsing</button>
        </div>
        
    </div>
{/if}