import RegisterPage from '../../../register/page';

export default function CompetitionRegisterPage({ params }: { params: { slug: string } }) {
  return <RegisterPage routeCompetitionSlug={params.slug} />;
}
