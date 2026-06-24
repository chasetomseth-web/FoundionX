export interface CompanyResolverProvider {
  resolveCompany(ip: string): Promise<{ company: string | null }>;
}

export class MockCompanyResolverProvider implements CompanyResolverProvider {
  async resolveCompany(ip: string): Promise<{ company: string | null }> {
    const mockCompanies = [
      'Acme Corp',
      'Globex Inc',
      'Initech',
      'Umbrella Ltd',
      'Stark Industries',
      null,
    ];
    const hash = ip.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return { company: mockCompanies[hash % mockCompanies.length] };
  }
}