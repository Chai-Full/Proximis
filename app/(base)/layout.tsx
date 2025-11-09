"use client";
import React, { useEffect } from "react";
import "./home/index.css";
import Link from "next/link";
import HomeIcon from '@mui/icons-material/Home';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import HomeContent from "./home/page";
import { SubmitHandler, useForm } from "react-hook-form";
import { InputsAnnounceSearch } from "../types/InputsAnnounceSearch";
import AnnouncementContent from "./announcement/page";
import { ContentProvider, useContent, PageKey } from "./ContentContext";
import { SearchOutlined } from "@mui/icons-material";
import PublishAnnouncementContent from "./publish_announcement/page";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import AnnounceDetails from "./announcement/announceDetails";

const navItems = [
        { id: "home", label: "Accueil", icon: HomeIcon, href: "/" },
        { id: "messages", label: "Messages", icon: MailOutlineIcon, href: "/messages" },
        { id: "search", label: "Rechercher", icon: SearchOutlined, href: "/search" },
        { id: "annonces", label: "Réservations", icon: TextSnippetIcon, href: "/annonces" },
        { id: "profil", label: "Profil", icon: PermIdentityIcon, href: "/profil" }
        ];

// Table de correspondance id -> composant de contenu
const contentComponents = {
    home: HomeContent,
    messages: HomeContent,
    search: HomeContent,
    annonces: AnnouncementContent,
    announce_details: AnnounceDetails,
    profil: HomeContent,
    publish: PublishAnnouncementContent,
};

// Inner component consumes the ContentContext (must be inside ContentProvider)
function BaseLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
    const { currentPage, setCurrentPage, history, goBack, headerTitle } = useContent();
    const currentNav = navItems.find(item => item.id === currentPage);
    const CurrentContent = (contentComponents as Record<string, React.ComponentType>)[currentPage] || HomeContent;
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
      } = useForm<InputsAnnounceSearch>();
      const onSubmit: SubmitHandler<InputsAnnounceSearch> = (data) => console.log(data);

    useEffect(() => {
        window.history.replaceState(null, "/home", "");
    }, []);
    const title = headerTitle ?? currentNav?.label ?? "Accueil";

    return (
        <div className="container">
            <div
                className="head"
            >
                {history.length > 0 ? (
                    <button
                        aria-label="back"
                        className="backButton"
                        onClick={() => goBack()}
                        style={{
                            position: "absolute",
                            left: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                    >
                        <ArrowBackOutlined sx={{ color: "white", cursor: "pointer" }} />
                    </button>
                ) : null}
                <span className="title T4" style={{ textAlign: "center" }}>
                    {title}
                </span>
            </div>
                <main className="mainContent">
                    <CurrentContent />
                </main>
                <nav className="bottomBar">
                {navItems.map(({ id, label, icon: Icon, href }) => (
                    <div
                        key={id}
                        className={`navItem ${currentPage === id ? "active" : ""}`}
                        onClick={() => setCurrentPage(id as PageKey)}
                        >
                        <Icon 
                            color={currentPage !== id ? "primary" : "secondary"}
                            fontSize={currentPage === id ? "large" : "medium"} 
                        />
                        <Link href="#" className="navLink">{label}</Link>
                    </div>
                ))}
                </nav>
        </div>
    );
}

export default function BaseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <ContentProvider>
            <BaseLayoutInner>{children}</BaseLayoutInner>
        </ContentProvider>
    );
}