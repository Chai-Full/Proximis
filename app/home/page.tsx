"use client";
import React, { useEffect } from "react";

export default function HomePage() {
    useEffect(() => {
        window.history.replaceState(null, "/home", "");
    }, []);
    return (
        <main style={{ padding: "2rem", textAlign: "center" }}>
            <h1>Bienvenue sur la page d'accueil</h1>
            <p>
                Commencez à explorer les offres !
            </p>
        </main>
    );
}