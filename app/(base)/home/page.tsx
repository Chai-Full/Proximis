

import HomeIcon from '@mui/icons-material/Home';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import Image from 'next/image';

export default function Home() {
    const navItems = [
        { id: "home", label: "Accueil", icon: HomeIcon, href: "/" },
        { id: "messages", label: "Messages", icon: MailOutlineIcon, href: "/messages" },
        { id: "annonces", label: "Annonces", icon: TextSnippetIcon, href: "/annonces" },
        { id: "profil", label: "Profil", icon: PermIdentityIcon, href: "/profil" }
        ];
    return (
        <>
           <div className="homeContainer">
            {
                (Array.isArray(navItems) ? navItems : []).map(({ id, label, icon: Icon }) => (
                    <div
                    key={id}
                    className="homeRedirectItem"
                    >
                        <Icon style={{ color: '#ff9202', fontSize: 40 }} />
                        <span>{label}</span>
                    </div>
                ))
            }
            </div>
            <div className="slider">
                <div className="slide">
                    <Image src="photo1.svg" width={500} height={300} alt="Annonce 1" />
                </div>
                <div className="slide">
                    <Image src="photo1.svg" width={500} height={300} alt="Annonce 2" />
                </div>
                <div className="slide">
                    <Image src="photo1.svg" width={500} height={300} alt="Annonce 3" />
                </div>
            </div>
        </>
    );
}