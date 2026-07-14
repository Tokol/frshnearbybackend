import { BadRequestException, Injectable } from '@nestjs/common';
import { User, UserRole } from '@frsh/database';
import { FirebaseService } from '../auth/firebase.service';
import { PrismaService } from '../../prisma.module';
import { BusinessProfileInput, PersonalProfileInput, ProducerProfileInput } from './user.inputs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly firebase: FirebaseService) {}

  updatePersonal(user: User, input: PersonalProfileInput) {
    return this.prisma.user.update({ where: { id: user.id }, data: {
      displayName: input.displayName, phone: input.phone, dateOfBirth: new Date(input.dateOfBirth),
      photoUrl: input.photoUrl, onboardingStep: 'ROLE_SELECTION_REQUIRED',
    }});
  }

  selectType(user: User, accountType: 'CONSUMER' | 'SIDE_HUSTLER' | 'BUSINESS') {
    const roles: UserRole[] = accountType === 'CONSUMER' ? [UserRole.CONSUMER] : [UserRole.CONSUMER, UserRole[accountType]];
    return this.prisma.user.update({ where: { id: user.id }, data: {
      roles,
      onboardingStep: accountType === 'BUSINESS' ? 'BUSINESS_DETAILS_REQUIRED' : accountType === 'SIDE_HUSTLER' ? 'PRODUCER_DETAILS_REQUIRED' : 'COMPLETE',
      verificationStatus: accountType === 'CONSUMER' ? 'NOT_REQUIRED' : 'DRAFT',
    }});
  }

  async saveProducer(user: User, input: ProducerProfileInput) {
    if (!user.roles.includes('SIDE_HUSTLER')) throw new BadRequestException('Select side hustler first');
    await this.prisma.producerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...input }, update: input });
    return this.prisma.user.update({ where: { id: user.id }, data: { onboardingStep: 'SUBMITTED_FOR_REVIEW', verificationStatus: 'DRAFT' } });
  }

  async saveBusiness(user: User, input: BusinessProfileInput) {
    if (!user.roles.includes('BUSINESS')) throw new BadRequestException('Select registered business first');
    await this.prisma.businessProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...input }, update: input });
    return this.prisma.user.update({ where: { id: user.id }, data: { onboardingStep: 'SUBMITTED_FOR_REVIEW', verificationStatus: 'DRAFT' } });
  }

  async submit(user: User) {
    const kind = user.roles.includes('BUSINESS') ? 'BUSINESS' : user.roles.includes('SIDE_HUSTLER') ? 'SIDE_HUSTLER' : null;
    if (!kind) throw new BadRequestException('Consumer accounts do not require verification');
    if (kind === 'BUSINESS' && !await this.prisma.businessProfile.findUnique({ where: { userId: user.id } })) throw new BadRequestException('Business profile is incomplete');
    if (kind === 'SIDE_HUSTLER' && !await this.prisma.producerProfile.findUnique({ where: { userId: user.id } })) throw new BadRequestException('Producer profile is incomplete');
    await this.prisma.$transaction([
      this.prisma.verificationSubmission.create({ data: { applicantId: user.id, kind, status: 'SUBMITTED' } }),
      this.prisma.user.update({ where: { id: user.id }, data: { verificationStatus: 'SUBMITTED', onboardingStep: 'SUBMITTED_FOR_REVIEW' } }),
    ]);
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  }

  async requestDeletion(user: User) {
    const executeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.accountDeletion.upsert({ where: { userId: user.id }, create: { userId: user.id, executeAfter }, update: { executeAfter, lastError: null } }),
      this.prisma.user.update({ where: { id: user.id }, data: { status: 'DELETION_PENDING' } }),
    ]);
    await this.firebase.auth.revokeRefreshTokens(user.firebaseUid);
    return true;
  }

  async deleteNow(user: User, confirmation: string) {
    if (confirmation !== 'DELETE') throw new BadRequestException('Type DELETE to confirm permanent account deletion');
    await this.firebase.auth.deleteUser(user.firebaseUid);
    await this.prisma.user.delete({ where: { id: user.id } });
    return true;
  }
}
