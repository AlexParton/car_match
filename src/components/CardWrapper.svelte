<script>
    import { garage } from '../data/garage'
import CarCard from './CarCard.svelte';
</script>

<style>
div {
    margin-top: 40px;
    padding: var(--padding);
}

@media(min-width: 768px) {
    div {
        display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    padding: 50px 5%;
    }
}
</style>

<div>
    {#each garage as car}
        <CarCard {car} />
    {/each}
</div>