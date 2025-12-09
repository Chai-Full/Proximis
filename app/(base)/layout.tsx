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
import AnnounceDetails from "./announcement/AnnouncementDetails";
import ProfileDetails from "./profile/profileDetails";
import { ContentProvider, useContent, PageKey } from "./ContentContext";
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import { useRouter } from 'next/navigation';
import { SearchOutlined } from "@mui/icons-material";
import PublishAnnouncementContent from "./publish_announcement/page";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import AnnouncementSearchPageContent from "./search/AnnouncementSearchPageContent";
import FilterPageContent from "./search/FilterPageContent";
import ReservationContent from "./reservation/page";
import MessageContent from "./message/page";
import ChatContent from "./message/ChatContent";

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
    messages: MessageContent,
    message_chat: ChatContent,
    search: AnnouncementSearchPageContent,
    filters: FilterPageContent,
    reservation: ReservationContent,
    annonces: AnnouncementContent,
    announce_details: AnnounceDetails,
    profil: ProfileDetails,
    publish: PublishAnnouncementContent,
};

// Inner component consumes the ContentContext (must be inside ContentProvider)
function BaseLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
    const { currentPage, setCurrentPage, history, goBack, headerTitle, setHeaderTitle, setSelectedProfileId, currentUserId, setCurrentUserId } = useContent();
    const router = useRouter();
    const currentNav = navItems.find(item => item.id === currentPage);
    const CurrentContent = (contentComponents as Record<string, React.ComponentType>)[currentPage] || HomeContent;
    const hideBottomNav = currentPage === "messages" || currentPage === "message_chat" || currentPage === "annonces" || currentPage === "profil";
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
                style={{
                    // Remove shadow on search page to blend with search header
                    boxShadow: currentPage === "search" ? "none" : undefined,
                }}
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
                        <ArrowBackOutlined color="primary" sx={{ cursor: "pointer" }} />
                    </button>
                ) : null}
                <span className="title T4" style={{ textAlign: "center" }}>
                    {title}
                </span>
                {/* logout button on the right when user is logged in and on home page */}
                {currentUserId != null && currentPage === "home" && (
                    <button
                        aria-label="logout"
                        className="backButton"
                        onClick={() => {
                            try { localStorage.removeItem('proximis_userId'); } catch (e) {}
                            setCurrentUserId && setCurrentUserId(null);
                            router.push('/');
                        }}
                        style={{
                            position: "absolute",
                            right: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                    >
                        <LogoutOutlined color="primary" sx={{ cursor: "pointer" }} />
                    </button>
                )}
            </div>
                <main className="mainContent" style={{ marginBottom: hideBottomNav ? 0 : undefined }}>
                    <CurrentContent />
                </main>
                {!hideBottomNav && (
                    <nav className="bottomBar">
                    {navItems.map(({ id, label, icon: Icon, href }) => (
                        <div
                            key={id}
                            className={`navItem ${currentPage === id ? "active" : ""}`}
                               onClick={() => {
                                   if (id === 'profil') {
                                       // when user clicks the navbar profile, show the connected user's profile (by id)
                                       if (setSelectedProfileId) setSelectedProfileId(currentUserId ?? null);
                                       setCurrentPage('profil');
                                   } else {
                                       setCurrentPage(id as PageKey);
                                   }
                               }}
                            >
                            <Icon 
                                color={currentPage !== id ? "primary" : "secondary"}
                                fontSize={currentPage === id ? "large" : "medium"} 
                            />
                            <Link href="#" className="navLink">{label}</Link>
                        </div>
                    ))}
                    </nav>
                )}
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