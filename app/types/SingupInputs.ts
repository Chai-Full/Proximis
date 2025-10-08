type UserType = 'client' | 'prestataire';

export type SignupInputs = {
    email: string;
    nom: string;
    prenom: string;
    type: UserType;
    adresse: string;
    codePostal: string;
    pays: string;
};
