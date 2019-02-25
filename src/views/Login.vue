<template>
    <div v-if="needsToken">
        <h1>Enter your GitHub Personal Access Token below:</h1>
        <p>Token should have <code>read:discussion</code> and <code>repo</code> permissions.</p>
        <label for="token">Token:</label>
        <input @keypress.enter="saveToken" id="token" v-model="token" type="password">
        <button :disabled="!token" @click="saveToken">Save</button>
    </div>
    <div v-else>
        <h1>You've already entered your token!</h1>
        <a @click="continueToApp">Continue</a>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';

    @Component({})
    export default class Login extends Vue {
        token: string = '';
        savedToken: string = '';

        get needsToken(): boolean {
            return this.savedToken.length === 0;
        }

        mounted() {
            const storedToken = localStorage.token;
            if (storedToken) {
                this.savedToken = storedToken;
            }
        }

        saveToken(): void {
            this.savedToken = this.token;
            localStorage.token = this.token;
            this.continueToApp();
        }

        continueToApp(): void {
            console.log('Would keep going...');
        }
    }
</script>

<style scoped>

</style>